import { test, expect } from '@playwright/test';
test('Chapter 1 contains the assignment and supports review, filtering, and deep links', async ({page})=>{
 const errors=[];page.on('pageerror',e=>errors.push(e.message));
 await page.route('https://pubchem.ncbi.nlm.nih.gov/**',route=>route.abort());
 await page.goto('./#chapter1');
 await expect(page.getByRole('tab',{name:'Chapter 1 practice'})).toHaveAttribute('aria-selected','true');
 await expect(page.locator('.practice-card')).toHaveCount(32);
 await expect(page.locator('.practice-card img')).toHaveCount(0);
 await expect(page.locator('.practice-card svg').first()).toBeVisible();
 await expect(page.locator('#structures-panel')).toBeHidden();
 await page.getByRole('combobox',{name:'Topic',exact:true}).selectOption('Formal charges');
 await expect(page.locator('.practice-card:visible')).toHaveCount(8);
 await page.getByLabel('Reviewed Problem 1.9',{exact:true}).check();
 await page.getByLabel('Unreviewed only').check();
 await expect(page.locator('.practice-card:visible')).toHaveCount(7);
 await page.reload();
 await expect(page.getByLabel('Reviewed Problem 1.9',{exact:true})).toBeChecked();
 await page.getByRole('combobox',{name:'Jump to problem'}).selectOption('1.38');
 await expect(page).toHaveURL(/#problem-1\.38$/);
 await expect(page.locator('[id="problem-1.38"]')).toBeFocused();
 await page.reload();
 await expect(page.locator('[id="problem-1.38"]')).toBeFocused();
 for(const n of ['1.10','1.22','1.38','1.49','1.50']){
  const card=page.locator(`[id="problem-${n}"]`);
  await card.scrollIntoViewIfNeeded();
  await card.screenshot({path:`test-results/${test.info().project.name}-chapter-${n}.png`});
 }
 expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBeTruthy();
 await page.goto('./#chapter1');
 await page.screenshot({path:`test-results/${test.info().project.name}-chapter-one.png`});
 await page.getByRole('tab',{name:'Structures',exact:true}).click();
 await expect(page.getByRole('textbox',{name:'Molecule input'})).toBeVisible();
 await expect(page.locator('#chapter-one')).toBeHidden();
 await page.getByRole('tab',{name:'Structures',exact:true}).press('ArrowRight');
 await expect(page.getByRole('tab',{name:'Chapter 1 practice'})).toBeFocused();
 await expect(page.locator('#chapter-one')).toBeVisible();
 expect(errors).toEqual([]);
});
test('switching tabs keeps the current molecule and its share URL',async({page})=>{
 await page.route('https://pubchem.ncbi.nlm.nih.gov/**',route=>route.abort());
 await page.goto('./?q=CCO&view=skeletal');
 await expect(page.locator('.workspace')).toBeVisible();
 const identity=await page.locator('#identity').textContent();
 const query=new URL(page.url()).search;
 await page.getByRole('tab',{name:'Chapter 1 practice'}).click();
 await expect(page).toHaveURL(url=>url.search===query&&url.hash==='#chapter1');
 await page.getByRole('tab',{name:'Structures',exact:true}).click();
 await expect(page.locator('.workspace')).toBeVisible();
 await expect(page.locator('#identity')).toHaveText(identity);
});
test('practice remains usable with unavailable browser storage',async({page})=>{
 await page.addInitScript(()=>{
  Storage.prototype.getItem=()=>{throw new Error('Storage blocked');};
  Storage.prototype.setItem=()=>{throw new Error('Storage blocked');};
 });
 await page.goto('./#chapter1');
 await expect(page.locator('.practice-card')).toHaveCount(32);
 await page.getByLabel('Reviewed Problem 1.4',{exact:true}).check();
 await expect(page.locator('#practice-count')).toHaveText('32 shown · 1 / 32 reviewed');
});
