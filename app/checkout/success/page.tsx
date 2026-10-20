import type {Metadata} from "next";
import CheckoutResult from "@/components/commerce/CheckoutResult";
import StoreHeader from "@/components/storefront/StoreHeader";
import Footer from "@/components/Footer";
import store from "@/components/storefront/storefront.module.css";
import styles from "@/components/commerce/commerce.module.css";
export const metadata:Metadata={title:"Your order — QubitSells",robots:{index:false,follow:false,noarchive:true}};
export default async function Page({searchParams}: {searchParams:Promise<{session_id?:string}>}) {const {session_id}=await searchParams;return <div className={store.storefront}><StoreHeader/><main id="main-content" className={`${store.container} ${styles.successPage}`}><CheckoutResult sessionId={typeof session_id==="string"?session_id.slice(0,260):""}/></main><Footer/></div>;}
