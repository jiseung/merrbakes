import Card from "@/components/Card";
import { Balsamiq_Sans} from "next/font/google";
import {ReviewType} from "@/components/types";

const balsamiq_sans = Balsamiq_Sans({
  weight: ['400','700'],
  style: ['normal', 'italic'],
  subsets: ['latin'],
  variable: '--font-balsamiq-sans'
});

export default function ReviewItem(props: ReviewType) {
  return (
    <Card className={`border-merrbakes-brown flex-col justify-center min-h-fit 
          ${balsamiq_sans.className} text-merrbakes-gray`}>
      <div className="flex flex-col items-center">
        <p className="text-lg">{props.content}</p>
        <h2 className="text-lg pt-2">{`-${props.author}-`}</h2>
      </div>
    </Card>
  )
}