/** Add owner facts to the frozen com viewer using its existing paragraph layout. */
export function ownerListingsComBundle(source){
 const replacements=[
  ['Canberra:"堪培拉",Brisbane:"布里斯班"},qe=', 'Canberra:"堪培拉",Brisbane:"布里斯班","Gold Coast":"黄金海岸"},qe='],
  ['facts:O==="sold"?X.soldDate?[i("成交日期：","Sold: ")+ra(X.soldDate,c)]:[]:X.availableDate?[i("可入住时间：","Available from: ")+ra(X.availableDate,c)]:[]', 'facts:[...(X.features||[]).map(o),...(O==="sold"?X.soldDate?[i("成交日期：","Sold: ")+ra(X.soldDate,c)]:[]:X.availableDate?[i("可入住时间：","Available from: ")+ra(X.availableDate,c)]:[])]'],
  ['"公开市场房源与成交参考，非桉湾代理或成交案例。","Public market listings and sold references, not EUCOVE agency listings or sales."', '"浏览出租房源及市场成交参考。市场参考不代表桉湾经手案例。","Explore rental homes and market sale references. Market references are not EUCOVE transactions."'],
 ];
 for(const [before,after] of replacements){
  if(source.split(before).length!==2)throw Error('Original com viewer changed; review owner listing integration');
  source=source.replace(before,after);
 }
 return source;
}
