import {NextResponse} from "next/server";
import {adminClient,apiError,requireUser} from "@/lib/server/security";
import {privateHeaders} from "@/lib/server/commerce";
import {accountReviewEntries} from "@/lib/server/reviews";
import {stripeMode} from "@/lib/server/stripe";

export async function GET(){try{const user=await requireUser();const items=await accountReviewEntries(user.id,adminClient());return NextResponse.json({items,mode:stripeMode()},{headers:privateHeaders});}catch(error){return apiError(error);}}
