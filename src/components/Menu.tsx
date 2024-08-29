"use client";
import { useState } from "react";
import {MenuProps} from "@/components/types";

export default function Menu(props: MenuProps) {
  const [open, setOpen] = useState(false);

  return open ? (
    <div className={`fixed w-screen h-fit-content flex flex-col items-center  
                    top-0 bg-merrbakes-yellow text-3xl p-10 z-50 text-merrbakes-brown
                    ${props.className}`}
         onClick={(e) => setOpen(!open)}>
      <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" fill="currentColor"
           className={`bi bi-house-heart-fill fill-merrbakes-brown fixed top-8 right-8 w-14 h-14 p-2
                      hover:cursor-pointer
                    ${props.className}`}
           viewBox="0 0 16 16"
           onClick={(e) => setOpen(!open)}>
        <path
          d="M7.293 1.5a1 1 0 0 1 1.414 0L11 3.793V2.5a.5.5 0 0 1 .5-.5h1a.5.5 0 0 1 .5.5v3.293l2.354 2.353a.5.5 0 0 1-.708.707L8 2.207 1.354 8.853a.5.5 0 1 1-.708-.707z"/>
        <path
          d="m14 9.293-6-6-6 6V13.5A1.5 1.5 0 0 0 3.5 15h9a1.5 1.5 0 0 0 1.5-1.5zm-6-.811c1.664-1.673 5.825 1.254 0 5.018-5.825-3.764-1.664-6.691 0-5.018"/>
      </svg>
      <div className={`rounded-lg px-2 pb-1 
                      hover:cursor-pointer hover:bg-merrbakes-blue hover:text-merrbakes-gray`}
           onClick={(e)=> props.scrollTo("top")}>
        top
      </div>
      <div className={`rounded-lg px-2 pb-1 
                      hover:cursor-pointer hover:bg-merrbakes-blue hover:text-merrbakes-gray`}
           onClick={(e)=> props.scrollTo("shop")}>
        shop goodies & reviews
      </div>
      <div className={`rounded-lg px-2 pb-1 
                      hover:cursor-pointer hover:bg-merrbakes-blue hover:text-merrbakes-gray`}
           onClick={(e)=> props.scrollTo("discord")}>
        discord msgs
      </div>
      <div className={`rounded-lg px-2 pb-1 
                      hover:cursor-pointer hover:bg-merrbakes-blue hover:text-merrbakes-gray`}
           onClick={(e)=> props.scrollTo("instagram")}>
        instagram posts
      </div>
      <div className={`rounded-lg px-2 pb-1 
                      hover:cursor-pointer hover:bg-merrbakes-blue hover:text-merrbakes-gray`}
           onClick={(e)=> props.scrollTo("throne")}>
        throne
      </div>
      <div className={`rounded-lg px-2 pb-1 
                      hover:cursor-pointer hover:bg-merrbakes-blue hover:text-merrbakes-gray`}
           onClick={(e)=> props.scrollTo("socials")}>
        socials
      </div>
    </div>
  ) : (
    <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" fill="currentColor"
         className={`bi bi-house-heart fill-merrbakes-brown fixed top-8 right-8 w-14 h-14 p-2 
                    rounded-lg bg-merrbakes-pink z-50 
                    hover:cursor-pointer hover:fill-merrbakes-brown hover:bg-merrbakes-yellow 
                    ${props.className}`}
         viewBox="0 0 16 16"
         onClick={(e) => setOpen(!open)}>
      <path d="M8 6.982C9.664 5.309 13.825 8.236 8 12 2.175 8.236 6.336 5.309 8 6.982"/>
      <path
        d="M8.707 1.5a1 1 0 0 0-1.414 0L.646 8.146a.5.5 0 0 0 .708.707L2 8.207V13.5A1.5 1.5 0 0 0 3.5 15h9a1.5 1.5 0 0 0 1.5-1.5V8.207l.646.646a.5.5 0 0 0 .708-.707L13 5.793V2.5a.5.5 0 0 0-.5-.5h-1a.5.5 0 0 0-.5.5v1.293zM13 7.207V13.5a.5.5 0 0 1-.5.5h-9a.5.5 0 0 1-.5-.5V7.207l5-5z"/>
    </svg>
  )
}