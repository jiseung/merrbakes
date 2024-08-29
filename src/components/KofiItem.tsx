import Image from "next/image";
import { useState } from "react";
import Card from './Card'
import {KofiItemType} from "@/app/api/types";
import {BannerTypes, KofiItemProps} from "@/components/types";

function Banner(props: KofiItemType) {
  const bannerType: BannerTypes = props.preorder
    ? 'preorder'
    : props.isSoldOut
      ? 'soldout'
      : typeof props.stock === 'number' && props.stock <= 5
        ? 'stock'
        : 'none';
  let bannerMsg = '';
  let bannerStyles = '';
  switch (bannerType) {
    case 'preorder':
      bannerMsg = 'preorder now!';
      bannerStyles = 'bg-merrbakes-green text-merrbakes-gray'
      break;
    case 'soldout':
      bannerMsg = 'sold out!';
      bannerStyles = 'bg-merrbakes-brown text-merrbakes-yellow'
      break;
    case 'stock':
      bannerMsg = `only ${props.stock} left!`;
      bannerStyles = 'bg-white text-merrbakes-brown'
      break;
    default:
      return null;
  }
  return (
    <div className={`absolute -rotate-45 object-cover z-10 box-border text-center
                    min-w-fit w-full text-xl -left-[50%] top-0 p-2 
                    sm:w-[150%] sm:-left-[70%] sm:top-[5%] xl:text-2xl 2xl:-left-[65%]
                    ${bannerStyles}`}>
      {bannerMsg}
    </div>
  );
}

export default function KofiItem(props: KofiItemProps) {
  const kofiImageStyle = {
    top: '0',
    bottom: '0',
    left: '0',
    right:'0'
  };

  const [imgSrc, setImgSrc] = useState<string>(props.item.image);

  return (
    <Card link={props.item.link}
          className={`aspect-square border-merrbakes-brown flex-col justify-between min-h-fit font-hand 
           ${props.className}`} >
      <div className="w-5/6 h-5/6 relative self-center">
        <Banner {...props.item} />
        <Image src={imgSrc} alt={props.item.name} fill={true} style={kofiImageStyle}
               sizes="(max-width: 640px) 100vw, (max-width: 768px) 50vw, (max-width: 1024px) 33vw, 25vw"
               onError={() => {
                 setImgSrc('https://storage.ko-fi.com/cdn/useruploads/display/4605534f-c2f6-467a-b3eb-53ec2358a982_untitleddesign.png')}}
               className="" />
        <Image src="/kofi.png" alt="Ko-fi" width={1259} height={853}
               className="absolute w-1/6 right-2 bottom-2"/>
      </div>
      <h2 className="text-merrbakes-brown">{"buy merrbakes " + props.item.name}</h2>
    </Card>
  );
}