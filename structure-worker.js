import * as OCL from "openchemlib";
import resources from "./node_modules/openchemlib/dist/resources.json" with { type: "json" };
OCL.Resources.register(resources);
self.onmessage = ({ data }) => {
  try {
    const molecule = OCL.Molecule.fromMolfile(data.molfile);
    const conformer = new OCL.ConformerGenerator(42).getOneConformerAsMolecule(molecule);
    self.postMessage({ molfile: conformer?.toMolfileV3() || null });
  } catch {
    self.postMessage({ molfile: null });
  }
};
