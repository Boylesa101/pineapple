// The Honest Coffee and Taylor Rose mock-ups in source/sites.js load their
// photos from static.wixstatic.com. The build points them at local copies in
// public/clients/, which `npm run fetch:images` downloads.
export const CLIENT_IMAGES = {
  'https://static.wixstatic.com/media/b26b21_3e22f3a5d3414b65a88e00a413031874~mv2.jpg/v1/fill/w_900,h_392,q_85/b26b21_3e22f3a5d3414b65a88e00a413031874~mv2.jpg':
    '/clients/honest-coffee-hero.jpg',
  'https://static.wixstatic.com/media/b26b21_e2486357e8ff46cbae368ddab8151c15~mv2.jpg/v1/fill/w_300,h_465,q_85/IMG_8512_JPG.jpg':
    '/clients/honest-coffee-tall.jpg',
  'https://static.wixstatic.com/media/eb1e1c5ab5cb4b289e110f234051208f.jpg/v1/fill/w_900,h_300,q_85/eb1e1c5ab5cb4b289e110f234051208f.jpg':
    '/clients/taylor-rose-hero.jpg',
};
