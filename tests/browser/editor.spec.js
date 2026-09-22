import { test, expect } from '@playwright/test';
import * as OCL from 'openchemlib';
OCL.Resources.registerFromNodejs();
async function edit(page, smiles) {
  await page.getByRole('button', {name:'Draw / edit structure'}).click();
  await page.locator('#editSmiles').fill(smiles);
  await page.getByRole('button', {name:'Load SMILES into drawing'}).click();
  await page.getByRole('button', {name:'Apply structure', exact:true}).click();
  await expect(page.locator('.editor-panel')).toBeHidden({ timeout: 25000 });
}
async function state(page) {
 return page.locator('mini-ochem').evaluate(app => ({
   smiles:app.state.resolved.smiles, formula:app.state.resolved.metadata.molecularFormula,
   geometry:app.state.resolved.geometry, cip:app.state.resolved.graph.nodes.map(n=>n.cip),
   cid:app.state.resolved.metadata.cid, atoms:app.state.resolved.graph.nodes.length
 }));
}
test('edit isomers, propagate views, preserve drafts and share exact structure', async ({page})=>{
 const errors=[]; page.on('pageerror',e=>errors.push(e.message));
 await page.goto('./');
 await edit(page,'C[C@H](O)CC');
 const first=await state(page);
 expect(first.geometry).toBeTruthy(); expect(first.cid).toBeNull();
 await expect(page.locator('#identity')).toContainText('C4H10O');
 await expect(page.locator('#skeletalSvg .metric-overlay')).toContainText([first.cip.find(Boolean)]);
 for (const label of ['Hybridization','Bond lengths','Bond angles']) await page.getByLabel(label,{exact:true}).check();
 await expect(page.locator('#skeletalSvg')).toContainText('Å');
 await expect(page.locator('#skeletalSvg')).toContainText('∠');
 await page.getByRole('button',{name:'3D ball + stick'}).click();
 await expect(page.locator('#stage3d canvas')).toBeVisible();
 await page.getByRole('button',{name:'Newman',exact:true}).click();
 await expect(page.locator('#newmanSvg')).toBeVisible();
 await page.getByRole('button',{name:'Symmetry',exact:true}).click();
 await expect(page.locator('#stageSym canvas')).toBeVisible();
 await edit(page,'C[C@@H](O)CC');
 const second=await state(page); expect(second.smiles).not.toEqual(first.smiles); expect(second.cip).not.toEqual(first.cip);
 await page.reload();
 await expect(page.locator('.workspace')).toBeVisible({timeout:25000});
 expect((await state(page)).smiles).toEqual(second.smiles);
 await page.getByRole('button',{name:'Draw / edit structure'}).click();
 await page.locator('#editSmiles').fill('CCCC');
 await page.getByRole('button',{name:'Load SMILES into drawing'}).click();
 await page.getByRole('button',{name:'Cancel',exact:true}).click();
 expect((await state(page)).smiles).toEqual(second.smiles);
 await edit(page,'CCCC'); const linear=await state(page);
 await edit(page,'CC(C)C'); const branch=await state(page);
 expect(linear.formula).toEqual(branch.formula); expect(linear.smiles).not.toEqual(branch.smiles);
 await edit(page,'C/C=C/C'); const e=await state(page);
 await edit(page,'C/C=C\\C'); const z=await state(page);
 expect(e.smiles).not.toEqual(z.smiles);
 await page.getByRole('button',{name:'Newman',exact:true}).click();
 await expect(page.locator('#newmanEmpty')).toBeVisible();
 expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBeTruthy();
 await page.screenshot({path:`test-results/${test.info().project.name}-views.png`,fullPage:true});
 expect(errors).toEqual([]);
});
test('empty or invalid draft leaves the existing molecule intact',async({page})=>{
 await page.goto('./'); await edit(page,'CCO'); const before=await state(page);
 await page.getByRole('button',{name:'Draw / edit structure'}).click();
 await page.locator('#editSmiles').fill('CC.O');
 await page.getByRole('button',{name:'Load SMILES into drawing'}).click();
 await expect(page.locator('#editorStatus')).toContainText('connected');
 expect((await state(page)).smiles).toEqual(before.smiles);
 await page.locator('mini-ochem').evaluate(app=>app.editor.clearAll());
 await page.getByRole('button',{name:'Apply structure',exact:true}).click();
 await expect(page.locator('#editorStatus')).toContainText('Draw a molecule');
 expect((await state(page)).smiles).toEqual(before.smiles);
 await page.screenshot({path:`test-results/${test.info().project.name}-editor.png`,fullPage:true});
});
test('draw directly on the canvas with mouse or touch',async({page,isMobile})=>{
 await page.goto('./');
 await page.getByRole('button',{name:'Draw / edit structure'}).click();
 const drawing=page.locator('#moleculeEditor canvas').last();
 await expect(drawing).toBeVisible();
 const box=await drawing.boundingBox();
 if(isMobile) await page.touchscreen.tap(box.x+box.width/2,box.y+140);
 else await drawing.click({position:{x:box.width/2,y:140}});
 await expect.poll(()=>page.locator('mini-ochem').evaluate(app=>app.editor.getMolecule().getAllAtoms())).toBeGreaterThan(0);
 await page.getByRole('button',{name:'Apply structure',exact:true}).click();
 await expect(page.locator('.workspace')).toBeVisible({timeout:25000});
 await page.getByRole('button',{name:'Draw / edit structure'}).click();
 await page.locator('#editSmiles').fill('C[C@H](O)CC');
 await page.getByRole('button',{name:'Load SMILES into drawing'}).click();
 await page.screenshot({path:`test-results/${test.info().project.name}-drawing.png`,fullPage:true});
});

test('PubChem stereo lookup and editing clear stale identity', async({page})=>{
 const mol=OCL.Molecule.fromSmiles('C[C@H](O)CC');
 const conformer=new OCL.ConformerGenerator(42).getOneConformerAsMolecule(mol.getCompactCopy());
 let requestedStereo=false;
 await page.route('https://pubchem.ncbi.nlm.nih.gov/**',async route=>{
   if(route.request().url().includes('/property/')) {
     requestedStereo=route.request().url().includes('SMILES');
     await route.fulfill({json:{PropertyTable:{Properties:[{CID:123,Title:'Stereo fixture',MolecularFormula:'C4H10O',SMILES:'C[C@H](O)CC',ConnectivitySMILES:'CC(O)CC'}]}}});
   } else if(route.request().url().includes('/SDF')) {
     await route.fulfill({body:conformer.toMolfile()+'\n$$$$',contentType:'chemical/x-mdl-sdfile'});
   } else await route.abort();
 });
 await page.goto('./?q=CID%20123');
 await expect(page.locator('.workspace')).toBeVisible({timeout:25000});
 expect(requestedStereo).toBeTruthy();
 expect((await state(page)).smiles).toContain('@');
 await expect(page.locator('#identity')).toContainText('Stereo fixture');
 await edit(page,'CC(C)C');
 expect((await state(page)).cid).toBeNull();
 await expect(page.locator('#identity')).not.toContainText('Stereo fixture');
});
