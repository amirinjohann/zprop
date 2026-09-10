const {test,expect}=require('./auth-fixture');
const {request:requests}=require('@playwright/test');
const crypto=require('node:crypto');
const path=require('node:path');
const password='Test-password-123!';

test('profile changes require authentication and current credentials, retain ownership, and revoke other sessions',async({request,baseURL})=>{
  const initial=(await (await request.get('/api/auth/session')).json()).user;
  const other=await requests.newContext({baseURL}), anonymous=await requests.newContext({baseURL});
  try {
    expect((await anonymous.get('/api/auth/profile')).status()).toBe(401);
    expect((await anonymous.get('/api/auth/avatar')).status()).toBe(401);
    expect((await anonymous.patch('/api/auth/profile',{data:{email:'new@example.com',currentPassword:password}})).status()).toBe(401);
    await other.post('/api/auth/sign-in',{data:{email:initial.email,password}});
    const slug='profile-'+crypto.randomBytes(6).toString('hex');
    expect((await request.post('/api/short-links',{data:{slug,destination:'https://example.com'}})).status()).toBe(201);
    const email='auth-'+crypto.randomUUID()+'@example.com';
    expect((await request.patch('/api/auth/profile',{headers:{Origin:'https://other.example'},data:{email,currentPassword:password}})).status()).toBe(403);
    expect((await request.patch('/api/auth/profile',{data:{email,currentPassword:'incorrect'}})).status()).toBe(400);
    expect((await request.patch('/api/auth/profile',{data:{role:'admin'}})).status()).toBe(400);
    expect((await request.patch('/api/auth/profile',{data:{avatar:'data:image/svg+xml;base64,PHN2Zz4='}})).status()).toBe(400);
    expect((await request.patch('/api/auth/profile',{data:{email:'bad',currentPassword:password}})).status()).toBe(400);
    const changed=await request.patch('/api/auth/profile',{data:{email,currentPassword:password}});
    expect(changed.status()).toBe(200);expect((await changed.json()).user).toMatchObject({id:initial.id,email,role:'user'});
    expect((await (await other.get('/api/auth/session')).json()).user).toBeNull();
    expect((await other.post('/api/auth/sign-in',{data:{email:initial.email,password}})).status()).toBe(401);
    expect((await other.post('/api/auth/sign-in',{data:{email,password}})).status()).toBe(200);
    const links=(await (await request.get('/api/dashboard-links')).json()).links;
    expect(links.some(link=>link.name===slug||link.url?.endsWith('/'+slug))).toBe(true);
    const newPassword='Updated-password-123!';
    expect((await request.patch('/api/auth/profile',{data:{newPassword,currentPassword:password}})).status()).toBe(200);
    expect((await (await other.get('/api/auth/session')).json()).user).toBeNull();
    expect((await other.post('/api/auth/sign-in',{data:{email,password}})).status()).toBe(401);
    expect((await other.post('/api/auth/sign-in',{data:{email,password:newPassword}})).status()).toBe(200);
    const profile=await (await request.get('/api/auth/profile')).json();
    expect(JSON.stringify(profile)).not.toMatch(/passwordHash|salt|Updated-password/);
    expect(profile.user.id).toBe(initial.id);
  } finally {await other.dispose();await anonymous.dispose();}
});

test('simultaneous email changes cannot take over another account',async({request,baseURL})=>{
  const other=await requests.newContext({baseURL});
  try {
    const original=(await (await request.get('/api/auth/session')).json()).user;
    const otherEmail='auth-'+crypto.randomUUID()+'@example.com';
    const registered=await other.post('/api/auth/register',{data:{email:otherEmail,password}});expect(registered.status()).toBe(201);
    expect((await request.patch('/api/auth/profile',{data:{email:otherEmail,currentPassword:password}})).status()).toBe(409);
    expect((await (await request.get('/api/auth/session')).json()).user.email).toBe(original.email);
    const target='auth-'+crypto.randomUUID()+'@example.com';
    const results=await Promise.all([request,other].map(client=>client.patch('/api/auth/profile',{data:{email:target,currentPassword:password}})));
    expect(results.map(response=>response.status()).sort()).toEqual([200,409]);
    const one=(await (await request.get('/api/auth/profile')).json()).user;
    const two=(await (await other.get('/api/auth/profile')).json()).user;
    expect(one.id).not.toBe(two.id);expect(one.email).not.toBe(two.email);
  } finally {await other.dispose();}
});

test('profile settings save email, password and photo, with bilingual controls and persistent avatar',async({page},info)=>{
  await page.emulateMedia({reducedMotion:'reduce'});
  const errors=[];page.on('pageerror',error=>errors.push(error.message));
  await page.goto('/tools/dashboard.html?lang=en');
  await page.locator('#profile-toggle').click();await page.locator('#profile-settings-link').click();
  await expect(page).toHaveURL(/tools\/profile.html\?lang=en/);
  await expect(page.locator('#profile-email')).toBeEnabled();
  await expect(page.locator('#settings-retry')).toBeHidden();
  await page.locator('#profile-photo').setInputFiles(path.resolve('assets/zprop-tech-logo-clean.png'));
  await expect(page.locator('#photo-status')).toContainText('Preview only');
  await page.locator('#save-photo').click();await expect(page.locator('#photo-status')).toHaveText('Profile photo saved.');
  await expect(page.locator('#sidebar-avatar')).toBeVisible();
  await expect.poll(()=>page.locator('#sidebar-avatar').evaluate(image=>image.naturalWidth)).toBe(256);
  await page.reload();await expect(page.locator('#settings-avatar')).toBeVisible();
  const email='auth-'+crypto.randomUUID()+'@example.com';
  await page.locator('#profile-email').fill(email);await page.locator('#email-current-password').fill('incorrect');
  await page.locator('#email-form button[type=submit]').click();await expect(page.locator('#email-status')).toHaveText('Current password is incorrect.');
  await page.locator('#email-current-password').fill(password);await page.locator('#email-form button[type=submit]').click();
  await expect(page.locator('#email-status')).toContainText('Email saved.');
  await expect(page.locator('#profile-toggle [data-profile-email]')).toHaveText(email);
  await page.locator('#password-current').fill(password);await page.locator('#password-new').fill('Updated-password-123!');await page.locator('#password-confirm').fill('Different-password-123!');
  await page.locator('#password-form button[type=submit]').click();await expect(page.locator('#password-status')).toHaveText('New passwords do not match.');
  await page.locator('#password-confirm').fill('Updated-password-123!');await page.locator('#password-form button[type=submit]').click();
  await expect(page.locator('#password-status')).toContainText('Password changed.');
  await expect(page.locator('#password-new')).toHaveValue('');
  await page.locator('[data-language=ms]').click();await page.locator('.theme-toggle').click();
  await expect(page.locator('#tool-title')).toHaveText('Urus akaun');
  await expect(page.locator('#password-status')).toContainText('Kata laluan ditukar.');
  expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBe(true);
  await page.screenshot({path:'test-results/profile-settings-'+info.project.name+'.png',fullPage:true});
  await page.locator('#remove-photo').click();await page.locator('#cancel-photo').click();await expect(page.locator('#settings-avatar')).toBeVisible();
  await page.locator('#remove-photo').click();await page.locator('#save-photo').click();await expect(page.locator('#photo-status')).toHaveText('Gambar profil disimpan.');
  await page.reload();await expect(page.locator('#settings-avatar')).toBeHidden();
  await expect(page.locator('#sidebar-avatar')).toBeHidden();expect(errors).toEqual([]);
});
