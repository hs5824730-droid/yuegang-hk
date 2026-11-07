/** Teach the frozen .com viewer to open for-sale homes on the 买卖房屋 tab. */
export function saleListingComBundle(source) {
  const replacements = [
    ['Promise.all(vd.map(async ne=>{try{const ge=await fetch(`/api/viewing-samples?kind=${ne}`', 'Promise.all(["rent","sold","sale"].map(async ne=>{try{const ge=await fetch(`/api/viewing-samples?kind=${ne}`'],
    ['const m=p?{rent:p.rent.filter(X=>lc(X)==="available"),sold:p.sold}:null,w=m&&vd.flatMap(X=>m[X]).find(X=>X.id===u.get("listing")),O=(w==null?void 0:w.kind)||(u.get("kind")==="sold"?"sold":"rent")', 'const m=p?{rent:p.rent.filter(X=>lc(X)==="available"),sold:[...(p.sale||[]),...(p.sold||[])]}:null,w=m&&[...m.rent,...m.sold].find(X=>X.id===u.get("listing")),O=w&&w.kind==="sale"||u.get("kind")==="sale"||w&&w.kind==="sold"||u.get("kind")==="sold"?"sold":"rent"'],
    ['X.set("kind",O),S?X.set("listing",S.id)', 'X.set("kind",S&&S.kind==="sale"?"sale":O),S?X.set("listing",S.id)'],
    ['const ne=g.current[X],ge=X==="rent"?p.rent.filter(te=>lc(te)==="available"):p.sold', 'const ne=g.current[X],ge=X==="rent"?p.rent.filter(te=>lc(te)==="available"):[...(p.sale||[]),...(p.sold||[])]'],
    ['le=()=>{S&&h(lc(S)==="available"?{service:"rent",listing:S.id,city:S.city,propertyAddress:`${S.address}, ${S.suburb}`}:{service:O==="sold"?"buy":"rent",city:S.city})}', 'le=()=>{S&&h(S.kind==="sale"?{service:"buy",listing:S.id,city:S.city,propertyAddress:`${S.address}, ${S.suburb}`}:lc(S)==="available"?{service:"rent",listing:S.id,city:S.city,propertyAddress:`${S.address}, ${S.suburb}`}:{service:O==="sold"?"buy":"rent",city:S.city})}'],
    ['H=X=>X.kind==="sold"?i("已成交","Sold"):i("可租","Available")', 'H=X=>X.kind==="sold"?i("已成交","Sold"):X.kind==="sale"?i("出售中","For sale"):i("可租","Available")'],
    ['priceNote:O==="sold"?X.soldPrice===null?i("已成交记录 · 成交价未公开","Sold record · price not disclosed"):i("已成交记录 · 成交价","Sold record · sold price"):i("挂牌周租，非成交租金。","Asking rent per week, not achieved rent.")', 'priceNote:X.kind==="sale"?i("出售挂牌价","Asking sale price"):O==="sold"?X.soldPrice===null?i("已成交记录 · 成交价未公开","Sold record · price not disclosed"):i("已成交记录 · 成交价","Sold record · sold price"):i("挂牌周租，非成交租金。","Asking rent per week, not achieved rent.")'],
    ['tag:O==="sold"?i("市场成交参考 · 已成交","Market reference · sold"):H(S)', 'tag:S.kind==="sale"?i("桉湾推荐","EUCOVE recommendation"):O==="sold"?i("市场成交参考 · 已成交","Market reference · sold"):H(S)'],
    ['Ly(S?{city:S.city,service:O==="sold"?"buy":"rent",listing:O==="rent"?S.id:void 0,propertyAddress:`${S.address}, ${S.suburb}`}:{city:M||void 0})', 'Ly(S?{city:S.city,service:S.kind==="sale"||O==="sold"?"buy":"rent",listing:O==="rent"||S.kind==="sale"?S.id:void 0,propertyAddress:`${S.address}, ${S.suburb}`}:{city:M||void 0})'],
    ['X==="sold"?i("已成交记录","Sold records"):i("挂牌资料","Listing records"),p&&` · ${(m==null?void 0:m[X].length)||0}`', 'X==="sold"?(p?i([((p.sale||[]).length?`挂牌出售中 ${(p.sale||[]).length}`:""),((p.sold||[]).length?`成交记录 ${(p.sold||[]).length}`:"")].filter(Boolean).join(" · ")||"暂无买卖记录",[((p.sale||[]).length?`${(p.sale||[]).length} for sale`:""),((p.sold||[]).length?`${(p.sold||[]).length} sold records`:"")].filter(Boolean).join(" · ")||"No sale records"):i("买卖记录","Sale records")):i("挂牌资料","Listing records"),X!=="sold"&&p&&` · ${(m==null?void 0:m[X].length)||0}`'],
  ];
  for (const [before, after] of replacements) {
    if (source.split(before).length !== 2) throw Error('Original com viewer changed; review sale listing integration');
    source = source.replace(before, after);
  }
  return source;
}
