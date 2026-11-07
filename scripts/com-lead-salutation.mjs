/** Add the optional Mr / Ms choice to the frozen com enquiry form, reusing its contact-method button row. */
export function leadSalutationComBundle(source){
 const choice='n.jsxs("fieldset",{className:"field lf-contact-methods lf-salutation",children:[n.jsx("legend",{children:m("先生／女士（选填）","Mr / Ms (optional)")}),n.jsx("div",{className:"lf-contact-options",children:[["mr","先生","Mr"],["ms","女士","Ms"]].map(([F,Ce,ke])=>n.jsx("button",{type:"button","aria-pressed":W.salutation===F,onClick:()=>it("salutation",W.salutation===F?"":F),children:m(Ce,ke)},F))})]}),';
 const replacements=[
  ['Hn("name")]}),n.jsxs("fieldset",{className:"field lf-contact-methods",', 'Hn("name")]}),'+choice+'n.jsxs("fieldset",{className:"field lf-contact-methods",'],
  ['contactMethod:W.contactMethod,...Jt?{preferredAdvisorId', 'contactMethod:W.contactMethod,...W.salutation?{salutation:W.salutation}:{},...Jt?{preferredAdvisorId'],
 ];
 for(const [before,after] of replacements){
  if(source.split(before).length!==2)throw Error('Original com enquiry form changed; review salutation integration');
  source=source.replace(before,after);
 }
 return source;
}
