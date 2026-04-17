export interface EventDetails {
  eventName: string;
  date: string;
  time: string;
  location: string;
  extraInfo?: string;
}

export interface CallScript {
  text: string;
  wordCount: number;
}

export interface Contact {
  id: string;
  name: string;
  phone: string;
  status: 'pending' | 'calling' | 'completed' | 'failed' | 'invalid';
}
