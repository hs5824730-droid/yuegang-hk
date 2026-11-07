// Runtime-independent validation policy, shared by Node and Cloudflare Workers.
export const cities = ['Hong Kong Island', 'Kowloon', 'New Territories', 'Islands'] as const;
export type City = typeof cities[number];
// Map frames are separate from property-tour validation; do not add them to tourHosts.
export const mapFrameOrigins = ['https://www.openstreetmap.org'] as const;
export const tourHosts = ['my.matterport.com', 'matterport.com', 'kuula.co', 'www.kuula.co', 'tour.klapty.com', 'iguide.au', 'youriguide.com'];
