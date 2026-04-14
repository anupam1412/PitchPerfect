export interface SlideData {
  title: string;
  subtitle?: string;
  contentPoints: string[];
  speakerNotes: string;
  slideType: 'title' | 'content' | 'feature' | 'summary';
}

export interface PresentationResponse {
  slides: SlideData[];
}
