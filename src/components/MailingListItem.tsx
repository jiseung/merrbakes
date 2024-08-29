"use client";
import Card from "@/components/Card";
import { useState } from "react";
import {MailingListProps} from "@/components/types";

export default function MailingListItem(props: MailingListProps) {
  const [email, setEmail] = useState('');
  const [joined, setJoined] = useState(false);
  const [error, setError] = useState('');

  async function joinMailingList() {
    try {
      const response = await fetch('/api/join', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ email })
      });
      const data = await response.json();
      if (data.success) {
        setJoined(true);
      }
    } catch (error) {
      setError('There was an error joining the mailing list. Please try again later.');
    }
  }

  return (
    <div className={`border-merrbakes-yellow text-merrbakes-brown bg-merrbakes-yellow 
          flex flex-col items-center w-screen p-10 text-2xl`}>
      <h2 className="text-3xl mb-2">join the merrbakes mailing list here!</h2>
      <div className="flex flex-row items-baseline justify-center w-full">
        <input type="text" placeholder="email address"
               className="border-merrbakes-brown p-1 text-center w-4/6 min-w-fit"
               value={email}
               onChange={(e) => setEmail(e.target.value)} />
        <span className={`text-3xl ml-2 border-merrbakes-brown border-solid border-2 
        w-fit px-2 pb-1 rounded-lg cursor-pointer hover:shadow-md`}
              onClick={(e) => joinMailingList()}>
          {joined ? 'joined!' : 'join'}
        </span>
      </div>
      {joined && <span className="text-merrbakes-green ml-2">
        thank you for joining! you will receive updates in your inbox soon!
      </span>}
      {error && <span className="text-merrbakes-brown ml-2">
        {error}
      </span>}
    </div>
  );
}