import {Contact} from '../pages/Info';
import type {ReceptionChannel} from '../reception-types';

/** Previously published channel URLs now collect the customer's own details. */
export default function ReceptionContact(_props:{channel?:ReceptionChannel|'phone'}){
 return <Contact/>;
}
