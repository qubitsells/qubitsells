import type {Metadata} from "next";
import MyTemplates from "@/components/commerce/MyTemplates";

export const metadata:Metadata={title:"My Templates — QubitSells",description:"Your purchased QubitSells templates, ready to personalize, publish, and share.",robots:{index:false,follow:false}};
export default function Page(){return <MyTemplates/>;}
