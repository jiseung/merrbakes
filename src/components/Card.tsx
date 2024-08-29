import Image from "next/image";
import { CardProps } from "@/components/types";

export default function Card(props: CardProps) {
  return props.link ? (
    <div id={props.id}
         className={`w-auto flex p-10 m-5 rounded-lg border-solid border-2 shadow-lg overflow-hidden
                    text-2xl text-center 
                    hover:border-3 hover:shadow-2xl hover:cursor-pointer ${props.className}`}
         onClick={(e) => {
           window.open(props.link, '_blank');
           e.stopPropagation();
         }} >
      {props.children}
    </div>
  ) : (
    <div id={props.id}
         className={`w-auto flex p-10 m-5 rounded-lg border-solid border-2 shadow-lg overflow-hidden
                    text-2xl text-center 
                    ${props.className}`}>
      {props.children}
    </div>
  );
}