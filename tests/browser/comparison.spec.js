import { test, expect } from '@playwright/test';
test('dimethylcyclopropane automatically compares every family isomer in 2D and 3D',async({page})=>{
 const errors=[];page.on('pageerror',e=>errors.push(e.message));
 await page.route('https://pubchem.ncbi.nlm.nih.gov/**',r=>r.abort());
 await page.goto('./');
 await page.getByRole('textbox',{name:'Molecule input'}).fill('dimethylcyclopropane');
 await page.getByRole('textbox',{name:'Molecule input'}).press('Enter');
 await expect(page.locator('.comparison-card')).toHaveCount(4);
 await expect(page.locator('.comparison')).toContainText('Meso');
 await expect(page.locator('.comparison')).toContainText('trans-(1R,2R)');
 await expect(page.locator('.comparison')).toContainText('trans-(1S,2S)');
 await expect(page.locator('.comparison-drawing svg')).toHaveCount(4);
 await expect(page).toHaveURL(/q=dimethylcyclopropane/);
 await page.reload(); await expect(page.locator('.comparison-card')).toHaveCount(4);
 expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBeTruthy();
 await page.screenshot({path:`test-results/${test.info().project.name}-isomers.png`,fullPage:true});
 await page.getByRole('button',{name:'3D comparison',exact:true}).click();
 await expect(page.locator('.comparison-stage canvas')).toHaveCount(4,{timeout:40000});
 await expect(page.locator('.compare-status')).toContainText('Computed conformers');
 await page.getByRole('button',{name:'Remove 1,1-Dimethylcyclopropane',exact:true}).click();
 await expect(page.locator('.comparison-card')).toHaveCount(3);
 await expect(page.locator('.comparison-stage canvas')).toHaveCount(3);
 await page.getByRole('button',{name:'Explore this structure'}).first().click();
 await expect(page.locator('.workspace')).toBeVisible({timeout:25000});
 await expect(page.locator('#identity')).toContainText('cis-1,2-Dimethylcyclopropane');
 await page.getByRole('button',{name:'Add current to comparison'}).click();
 await expect(page.locator('.comparison-card')).toHaveCount(3);
 await expect(page.locator('.compare-status')).toContainText('already');
 await page.getByRole('button',{name:'Isomers / compare'}).click();
 await expect(page.locator('.comparison-card')).toHaveCount(4);
 await page.getByRole('button',{name:'Clear comparison'}).click();
 await expect(page.locator('.comparison')).toBeHidden();
 expect(errors).toEqual([]);
});

test('formula candidates can be added to comparison without replacing the main molecule',async({page})=>{
 await page.route('https://pubchem.ncbi.nlm.nih.gov/**',async route=>{
   if(route.request().url().includes('/fastformula/')) await route.fulfill({json:{IdentifierList:{CID:[1,2]}}});
   else if(route.request().url().includes('/property/')) await route.fulfill({json:{PropertyTable:{Properties:[
     {CID:1,Title:'Ethanol',MolecularFormula:'C2H6O',SMILES:'CCO'},
     {CID:2,Title:'Dimethyl ether',MolecularFormula:'C2H6O',SMILES:'COC'}]}}});
   else await route.abort();
 });
 await page.goto('./?q=C2H6O');
 await expect(page.locator('.candidate-option')).toHaveCount(2);
 await page.getByRole('button',{name:'Add to comparison',exact:true}).nth(0).click();
 await page.getByRole('button',{name:'Add to comparison',exact:true}).nth(1).click();
 await expect(page.locator('.comparison-card')).toHaveCount(2);
 await expect(page.locator('.comparison')).toContainText('Ethanol');
 await expect(page.locator('.comparison')).toContainText('Dimethyl ether');
});
