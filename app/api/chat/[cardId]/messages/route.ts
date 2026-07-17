import { NextResponse } from "next/server";
import { getTarotCardById } from "@/lib/tarot-cards";
import { getTarotLibraryEntry } from "@/lib/tarot-library";
import { getTarotChatPersona, isChatEligibleCard } from "@/lib/tarot-chat-personas";
import { parseChatCardId, parseChatMessageRequest } from "@/lib/tarot-chat-contract";
import { classifyChatRisk, getSafetyFallback, guardChatReply } from "@/lib/tarot-chat-safety";
import { createChatRateLimiter } from "@/lib/tarot-chat-rate-limit";
import { buildTarotChatMessages } from "@/lib/tarot-chat-prompt";
import { requestTarotChatCompletion, TarotChatModelError } from "@/lib/tarot-chat-model";
export const runtime = "nodejs";
const limiter=createChatRateLimiter({limit:8,windowMs:15*60*1000});
export async function POST(request:Request,{params}:{params:{cardId:string}}){const id=parseChatCardId(params.cardId);const card=id===null?null:getTarotCardById(id);const persona=id===null?null:getTarotChatPersona(id);const entry=id===null?null:getTarotLibraryEntry(id);if(!card||!isChatEligibleCard(card)||!persona||!entry)return NextResponse.json({error:"没有找到这位牌面角色。"},{status:404});let body:unknown;try{body=await request.json();}catch{return NextResponse.json({error:"消息内容不完整或不符合当前对话要求。"},{status:400});}const parsed=parseChatMessageRequest(body);if(!parsed)return NextResponse.json({error:"消息内容不完整或不符合当前对话要求。"},{status:400});const key=request.headers.get("x-forwarded-for")?.split(",")[0]?.trim()||"anonymous";const hit=limiter.consume(key);if(!hit.allowed)return NextResponse.json({error:"请求较多，请稍后再继续对话。"},{status:429,headers:{"Retry-After":String(Math.ceil(hit.retryAfterMs/1000))}});const risk=classifyChatRisk(parsed.message);if(risk)return NextResponse.json({message:getSafetyFallback(risk)});try{const model=process.env.DEEPSEEK_CHAT_MODEL?.trim()||process.env.DEEPSEEK_MODEL?.trim()||"deepseek-v4-flash";const reply=await requestTarotChatCompletion({apiKey:process.env.DEEPSEEK_API_KEY,model,messages:buildTarotChatMessages({card,entry,persona,history:parsed.history,message:parsed.message})});return NextResponse.json({message:guardChatReply({inputRisk:null,reply}).content});}catch(error){console.error({category:error instanceof TarotChatModelError?error.code:"unknown"});return NextResponse.json({error:"聊天服务暂时不可用，请稍后再试。"},{status:503});}}
