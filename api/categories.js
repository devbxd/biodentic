const CATEGORIES = [
  { slug: 'disposable', label: 'Disposables' },
  { slug: 'endo', label: 'Endodontics' },
  { slug: 'impression', label: 'Impression Materials' },
  { slug: 'polishing', label: 'Polishing' },
  { slug: 'fraise', label: 'Burs' },
  { slug: 'instrument', label: 'Instruments' },
  { slug: 'temporary', label: 'Temporary Materials' },
  { slug: 'machine', label: 'Equipment' },
  { slug: 'restorative', label: 'Restorative' },
  { slug: 'whitening', label: 'Whitening' },
  { slug: 'cementation', label: 'Cementation' },
  { slug: 'fiberpost', label: 'Fiber Posts' },
  { slug: 'etching', label: 'Etching & Bonding' },
  { slug: 'ortho', label: 'Orthodontics' },
  { slug: 'xray', label: 'X-Ray' },
  { slug: 'prevention', label: 'Prevention' },
  { slug: 'crowns', label: 'Crowns' },
  { slug: 'implant', label: 'Implant' },
  { slug: 'uniform', label: 'Uniform' },
];

module.exports = async (req, res) => {
  res.setHeader('Cache-Control', 'public, max-age=300');
  res.status(200).json(CATEGORIES);
};

module.exports.CATEGORIES = CATEGORIES;
