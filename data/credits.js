// Ledicia's credits: the starting list for the site and the admin panel.
// Once Supabase is connected the live list comes from the `credits` table and this file is only the seed
// (and the fallback when the database cannot be reached). Every link is a public page that names her.
// kind: lidar (LiDAR / environment capture) · data (VFX data wrangling) · lead · camera (camera & lighting)
const MC = 'https://www.metacritic.com';
const PERSON = `${MC}/person/ledicia-castro/`;

export default [
  { year: 2026, title: 'Practical Magic 2', kind: 'lead', role: 'VFX lead data wrangler', note: 'Feature', company: '', vfx: 'One of Us', camera: '', link: `${MC}/movie/practical-magic-2/credits/`, source: 'Metacritic' },
  { year: 2026, title: 'The Last House', kind: 'data', role: 'VFX data wrangler', note: 'Feature', company: '', vfx: 'ILM', camera: '', link: `${MC}/movie/the-last-house/credits/`, source: 'Metacritic' },
  { year: 2025, title: 'The Walking Dead: Daryl Dixon', kind: 'data', role: 'VFX data wrangler', note: 'Series, 7 episodes', company: 'AMC', vfx: 'MPC, BUF', camera: '', link: `${MC}/tv/the-walking-dead-daryl-dixon/credits/`, source: 'Metacritic' },
  { year: 2025, title: 'Wicked: For Good', kind: 'data', role: 'Data wrangler', note: 'Feature', company: 'NBCUniversal', vfx: 'ILM, Framestore', camera: '', link: `${MC}/movie/wicked-for-good/credits/`, source: 'Metacritic' },
  { year: 2025, title: 'Jurassic World Rebirth', kind: 'data', role: 'VFX data wrangler', note: 'Feature', company: 'Universal', vfx: 'ILM', camera: '35mm Kodak film, Panavision', link: PERSON, source: 'Metacritic' },
  { year: 2024, title: 'Better Man', kind: 'data', role: 'VFX data wrangler, texture photography', note: 'Feature', company: 'Wētā FX', vfx: 'Wētā FX', camera: '', link: `${MC}/movie/better-man/credits/`, source: 'Metacritic' },
  { year: 2024, title: 'Wicked', kind: 'data', role: 'VFX data wrangler', note: 'Feature', company: 'NBCUniversal', vfx: 'ILM, Framestore', camera: 'ARRI ALEXA 65, Panavision anamorphics', link: PERSON, source: 'Metacritic' },
  { year: 2024, title: 'Kaos', kind: 'data', role: 'VFX data wrangler', note: 'Netflix series', company: 'Netflix', vfx: 'Cinesite, Freefolk, Milk', camera: 'Sony VENICE, Cooke lenses', link: 'https://www.imdb.com/name/nm6484884/', source: 'IMDb' },
  { year: 2023, title: 'Fast X', kind: 'data', role: 'Data wrangler, second unit', note: 'Feature', company: 'NBCUniversal', vfx: 'DNEG', camera: '', link: PERSON, source: 'Metacritic' },
  { year: 2022, title: 'Jurassic World Dominion', kind: 'lidar', role: 'Environment capture specialist', note: 'Feature', company: 'Lidar Lounge', vfx: 'ILM', camera: 'Panavision 65mm and VistaVision', link: `${MC}/movie/jurassic-world-dominion/credits/`, source: 'Metacritic' },
  { year: 2022, title: 'The Batman', kind: 'lidar', role: 'Scanning technician', note: 'Feature', company: 'Lidar Lounge', vfx: 'ILM, Wētā FX, Scanline', camera: 'ARRI ALEXA LF and Mini LF', link: 'https://shotonwhat.com/the-batman-2022', source: 'ShotOnWhat' },
  { year: 2022, title: 'Death on the Nile', kind: 'lidar', role: 'Environment capture', note: 'Feature', company: 'Lidar Lounge', vfx: 'DNEG', camera: 'Panavision System 65 film', link: PERSON, source: 'Metacritic' },
  { year: 2021, title: 'No Time to Die', kind: 'lidar', role: 'LiDAR scanning', note: 'Feature', company: 'Lidar Lounge', vfx: 'Framestore, ILM, DNEG', camera: '35mm, 65mm and IMAX film', link: 'https://shotonwhat.com/no-time-to-die-2021', source: 'ShotOnWhat' },
  { year: 2020, title: 'Wonder Woman 1984', kind: 'lidar', role: 'Environment capture, cyberscanning', note: 'Feature', company: 'Lidar Lounge', vfx: 'DNEG, Framestore, Method', camera: '35mm, 65mm and IMAX film', link: 'https://shotonwhat.com/wonder-woman-1984-2020', source: 'ShotOnWhat' },
  { year: 2020, title: 'Devs', kind: 'lidar', role: 'LiDAR scanning, cyberscanning', note: 'FX series, 8 episodes', company: 'Lidar Lounge', vfx: 'DNEG', camera: 'Sony VENICE, Panavision C-Series', link: `${MC}/tv/devs/credits/`, source: 'Metacritic' },
  { year: 2020, title: 'Cursed', kind: 'lidar', role: 'LiDAR scanning, cyberscanning', note: 'Netflix series, 10 episodes', company: 'Lidar Lounge', vfx: 'Freefolk', camera: 'Sony VENICE, 6K', link: `${MC}/tv/cursed-2020/credits/`, source: 'Metacritic' },
  { year: 2019, title: 'Hobbs & Shaw', kind: 'lidar', role: 'LiDAR scanning', note: 'Feature', company: 'Lidar Lounge', vfx: 'DNEG, Framestore', camera: 'ARRI Alexa SXT and Alexa Mini, Hawk anamorphics', link: PERSON, source: 'Metacritic' },
  { year: 2016, title: 'Chef', kind: 'camera', role: 'Cinematographer', note: 'Short', company: '', vfx: '', camera: '', link: 'https://watch.plex.tv/movie/chef-4', source: 'Plex' },
  { year: 2015, title: 'Predator: Dark Ages', kind: 'camera', role: 'Spark', note: 'Short', company: '', vfx: '', camera: '', link: 'https://www.imdb.com/title/tt4171544/', source: 'IMDb' },
];
