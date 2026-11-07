/** Link the frozen com navigation, home and advisory tiles to the standalone home services page; no visual redesign. */
export function homeServicesComBundle(source){
 const page='i("/zh/home-services","/en/home-services")';
 const replacements=[
  // Home page "extras" tile.
  ['{to:"/?service=house-care",Icon:vs,t:i("房屋打理","Home care"),d:i("空置看护、清洁、花园维护。","Vacancy checks, cleaning, garden upkeep.")}', '{to:'+page+',Icon:vs,t:i("房屋服务","Home services"),d:i("园艺、清洁、居家照看，推广期人工半价。","Garden, cleaning and home sitting, with half-price labour.")}'],
  ['n.jsxs(Ee,{to:h,children:[n.jsx(p,{size:20,"aria-hidden":!0})', 'n.jsxs(Ee,{to:h,reloadDocument:h.endsWith("/home-services"),children:[n.jsx(p,{size:20,"aria-hidden":!0})'],
  // Header, mobile menu and footer navigation share one list.
  ['{to:"/advisory",label:i("置业顾问","Property services")},', '{to:"/advisory",label:i("置业顾问","Property services")},{to:'+page+',label:i("房屋服务","Home services")},'],
  // Advisory page service tile.
  ['t:i("房屋打理","Home care"),d:i("空置看护、清洁与花园维护安排","Vacancy checks, cleaning and garden upkeep"),to:"/?service=care"}', 't:i("房屋服务","Home services"),d:i("园艺、清洁、居家照看，推广期人工半价","Garden, cleaning and home sitting, with half-price labour"),to:'+page+'}'],
  ['n.jsxs(Ee,{to:g.to,children:[n.jsx(ol,{children:g.icon})', 'n.jsxs(Ee,{to:g.to,reloadDocument:g.to.endsWith("/home-services"),children:[n.jsx(ol,{children:g.icon})'],
 ];
 // The three navigation renders load the standalone page as a full document.
 const navLink='{to:w.to,end:w.to==="/",';
 if(source.split(navLink).length!==4)throw Error('Original com tiles changed; review home services integration');
 source=source.split(navLink).join(navLink+'reloadDocument:w.to.endsWith("/home-services"),');
 for(const [before,after] of replacements){
  if(source.split(before).length!==2)throw Error('Original com tiles changed; review home services integration');
  source=source.replace(before,after);
 }
 return source;
}
