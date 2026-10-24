import type { TemplateTool } from "./supabase/coupleTemplates";
import { revealQuestions } from "./template-activities";

/** Validate publication separately from legacy tool schemas and saved gifts. */
export function senderPreparationError(tools: TemplateTool[]): string {
  for(const tool of tools){
    if(!tool.enabled)continue;
    if(tool.type==="poll"&&tool.selectionMode==="both_vote"){
      const choices=tool.senderOptionIds||[];
      if(!choices.length)return "Choose your own answer in Vibe Check & Poll before continuing.";
      if(new Set(choices).size!==choices.length||choices.some(id=>!tool.options.some(option=>option.id===id))||(!tool.allowMultiple&&choices.length!==1))return "Choose a valid poll option for your own answer.";
    }
    if(tool.type==="question")for(const question of tool.questions){
      if(!question.sender_answer?.trim())return "Write your answer in Heart-to-Heart Q&A before continuing.";
      if(question.type==="choice"&&!question.options?.includes(question.sender_answer))return "Choose an offered option for your Heart-to-Heart answer.";
    }
    if(tool.type==="private_reveal"){
      const questions=revealQuestions(tool.prompt,tool.questions),answers=tool.senderAnswers||{};
      if(questions.some(question=>!answers[question.id]?.trim()))return "Write your private answer in Synchronized Secret before continuing.";
      if(Object.keys(answers).some(id=>!questions.some(question=>question.id===id)))return "Check the questions for your Synchronized Secret answers.";
    }
  }
  return "";
}
