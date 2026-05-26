export default function AboutPage() {
  return (
    <div className="container mx-auto px-4 py-16 max-w-3xl">
      <h1 className="text-3xl font-bold text-slate-800 mb-6">About CDOT MSE Design</h1>
      <div className="prose prose-slate max-w-none space-y-4 text-slate-600">
        <p>
          CDOT MSE Design is a web-based engineering tool for designing and analyzing
          Mechanically Stabilized Earth (MSE) retaining walls in accordance with CDOT standards.
        </p>
        <p>
          The tool supports external and internal stability checks for abutment walls and
          wing walls, covering both standard and live load surcharge conditions.
        </p>
        <h2 className="text-xl font-semibold text-slate-800 mt-8">Design Types</h2>
        <ul className="list-disc list-inside space-y-1">
          <li>Abutment External Stability</li>
          <li>Abutment Internal Stability</li>
          <li>Wing External Stability</li>
          <li>Wing External Stability (Live Load Surcharge)</li>
          <li>Wing Internal Stability</li>
        </ul>
        <h2 className="text-xl font-semibold text-slate-800 mt-8">Features</h2>
        <ul className="list-disc list-inside space-y-1">
          <li>Project and team management</li>
          <li>Document storage per project</li>
          <li>Step-by-step stability analysis with detailed results</li>
          <li>Word and Excel report export</li>
          <li>Interactive project map</li>
        </ul>
      </div>
    </div>
  );
}
