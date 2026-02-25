export interface RssFeedArticle {
  title: string;
  href: string;
  source: string;
  pubDate: string;
  summary: string;
}

export interface RssFeedResult {
  feedId: string;
  feedName: string;
  articles: RssFeedArticle[];
  fetchedAt: string;
  error?: string;
}

export const PRESET_FEEDS = [
  {
    id: "nejm-neurology",
    name: "NEJM — Neurology",
    url: "https://www.nejm.org/action/showFeed?jc=nejm&type=etoc&feed=rss"
  },
  {
    id: "lancet-neurology",
    name: "Lancet Neurology",
    url: "https://www.thelancet.com/rssfeed/laneur_current.xml"
  },
  {
    id: "nature-neuro",
    name: "Nature Neuroscience",
    url: "https://www.nature.com/neuro.rss"
  },
  {
    id: "ann-neurology",
    name: "Annals of Neurology",
    url: "https://onlinelibrary.wiley.com/feed/15318249/most-recent"
  },
  {
    id: "pubmed-ai-neuro",
    name: "PubMed: AI + Neurology",
    url: "https://pubmed.ncbi.nlm.nih.gov/rss/search/1hxQkCqPa5U1lJTJByIbBJNjJfE_PbZC4WtNPgIAV7g5ZfTmV7/?limit=20&utm_campaign=pubmed-2&fc=20250101000000"
  },
] as const;

export type PresetFeedId = typeof PRESET_FEEDS[number]["id"];
