import {useEffect, useRef, useState} from "react";
import {TwitchProps} from "@/components/types";

export default function TwitchViewer(props: TwitchProps) {
  const streamRef = useRef<HTMLDivElement>(null);
  const [popStream, setPopStream] = useState(false);

  useEffect(() => {
    const observer = new IntersectionObserver((entries) => {
      entries.forEach((entry) => {
        if (entry.intersectionRatio < 0.3) {
          setPopStream(true);
        }
        if (entry.isIntersecting) {
          setPopStream(false);
        }
      });
    });
    observer.observe(streamRef.current!);
    return ()=>  {
      observer.disconnect();
    }
  }, [])

  return (
    <div ref={streamRef}
         className={"w-full aspect-video py-10 box-content"}>
      <div id="twitch-embed"
           className={popStream
             ? `fixed bottom-1 right-1 aspect-video z-30 shadow-merrbakes-brown shadow-2xl
                          w-5/6 sm:w-4/6 md:w-1/2 lg:w-2/6 group`
             : "w-full aspect-video py-10 box-content"}>
        {popStream && (
          <svg xmlns="http://www.w3.org/2000/svg" fill="currentColor"
               className={"bi bi-box-arrow-in-up-left hidden absolute h-10 w-10 top-3 left-3 rounded-lg " +
                 "fill-merrbakes-brown p-1 hover:bg-slate-50/50 hover:cursor-pointer group-hover:block"}
               onClick={() => props.scrollTo('top')}
               viewBox="0 0 16 16">
            <path fillRule="evenodd" d="M9.636 13.5a.5.5 0 0 1-.5.5H2.5A1.5 1.5 0 0 1 1 12.5v-10A1.5 1.5 0 0 1 2.5 1h10A1.5 1.5 0 0 1 14 2.5v6.636a.5.5 0 0 1-1 0V2.5a.5.5 0 0 0-.5-.5h-10a.5.5 0 0 0-.5.5v10a.5.5 0 0 0 .5.5h6.636a.5.5 0 0 1 .5.5"/>
            <path fillRule="evenodd" d="M5 5.5a.5.5 0 0 1 .5-.5h5a.5.5 0 0 1 0 1H6.707l8.147 8.146a.5.5 0 0 1-.708.708L6 6.707V10.5a.5.5 0 0 1-1 0z"/>
          </svg>
        )}
        {popStream && (
          <svg xmlns="http://www.w3.org/2000/svg" fill="currentColor"
               className={"bi bi-x hidden absolute top-3 right-3 h-10 w-10 rounded-lg " +
                 "fill-merrbakes-brown p-1 hover:bg-slate-50/50 hover:cursor-pointer group-hover:block"}
               onClick={() => setPopStream(false)}
               viewBox="0 0 16 16">
            <path
              d="M4.646 4.646a.5.5 0 0 1 .708 0L8 7.293l2.646-2.647a.5.5 0 0 1 .708.708L8.707 8l2.647 2.646a.5.5 0 0 1-.708.708L8 8.707l-2.646 2.647a.5.5 0 0 1-.708-.708L7.293 8 4.646 5.354a.5.5 0 0 1 0-.708"/>
          </svg>
        )}
      </div>
    </div>
  );
}