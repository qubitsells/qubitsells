import type {Metadata} from "next";
import {notFound} from "next/navigation";
import {getProductDetails} from "@/lib/product-details";
import {getSiteUrl,PRODUCTS} from "@/lib/storefront";
import ProductPage from "@/components/commerce/ProductPage";
import StoreHeader from "@/components/storefront/StoreHeader";
import Footer from "@/components/Footer";
import store from "@/components/storefront/storefront.module.css";
import styles from "@/components/commerce/commerce.module.css";
type Props={params:Promise<{slug:string}>};
export const dynamicParams=false;
export function generateStaticParams(){return PRODUCTS.map(({slug})=>({slug}));}
export async function generateMetadata({params}:Props):Promise<Metadata>{const {slug}=await params;const product=getProductDetails(slug);return product?{title:`${product.name} — QubitSells`,description:product.description,alternates:{canonical:`/products/${slug}`},openGraph:{title:product.name,description:product.description,images:[product.image]}}:{title:"Template not found"};}
export default async function Page({params}:Props){const {slug}=await params;const product=getProductDetails(slug);if(!product)notFound();const url=getSiteUrl();return <div className={store.storefront}><StoreHeader/><main id="main-content" className={`${store.container} ${styles.productPage}`}><ProductPage product={product}/></main><Footer/><script type="application/ld+json" dangerouslySetInnerHTML={{__html:JSON.stringify({"@context":"https://schema.org","@type":"Product",name:product.name,description:product.description,image:url?`${url}${product.image}`:product.image,brand:{"@type":"Brand",name:"QubitSells"},category:"Personalized digital template"}).replace(/</g,"\\u003c")}}/></div>;}
