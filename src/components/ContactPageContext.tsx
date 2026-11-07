import {createContext,useContext,useEffect,useState,type ReactNode} from 'react';
import {useLocation} from 'react-router-dom';
import {normalizeServiceQuery,type ServiceInput} from '../enquiry-options';

export interface ContactPageOptions {service?:ServiceInput;city?:string;listing?:string;offer?:boolean;member?:string;propertyId?:string;propertyAddress?:string;}
const Context=createContext<{page:{key:string;options:ContactPageOptions}|null;setPage:React.Dispatch<React.SetStateAction<{key:string;options:ContactPageOptions}|null>>}>({page:null,setPage:()=>{}});
export function ContactPageProvider({children}:{children:ReactNode}){
 const [page,setPage]=useState<{key:string;options:ContactPageOptions}|null>(null);
 return <Context.Provider value={{page,setPage}}>{children}</Context.Provider>;
}
/** Detail pages publish their actual selected record, never an inferred visitor location. */
export function usePublishContactPage(options:ContactPageOptions){
 const location=useLocation(),{setPage}=useContext(Context),key=location.pathname+location.search;
 const serialized=JSON.stringify(options);
 useEffect(()=>{setPage({key,options:JSON.parse(serialized)});return()=>setPage(old=>old?.key===key?null:old);},[key,serialized,setPage]);
}
export function useContactPageOptions():ContactPageOptions{
 const location=useLocation(),{page}=useContext(Context),q=new URLSearchParams(location.search);
 const base:ContactPageOptions={service:normalizeServiceQuery(q.get('service')),city:q.get('city')?.trim()||undefined,listing:q.get('listing')||undefined,member:q.get('member')||undefined,offer:q.get('offer')==='1'||location.pathname==='/offer'};
 return {...base,...(page?.key===location.pathname+location.search?page.options:{})};
}
