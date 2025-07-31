// Enhanced version with working playback and CORS fixes
export const params = (new URL(location.href)).searchParams;

export const getSaved = (key: string): string | null => {
  try {
    return localStorage.getItem(key);
  } catch (e) {
    console.error("LocalStorage access failed:", e);
    return null;
  }
};

// CORS Proxy Solution
const getProxiedUrl = (url: string): string => {
  return `https://corsproxy.io/?${encodeURIComponent(url)}`;
};

export const store: {
  player: {
    playbackState: 'none' | 'playing' | 'paused',
    hls: {
      on: boolean,
      src: (url: string) => void,
      api: string[],
      manifests: string[]
    },
    hq: boolean,
    codec: 'opus' | 'aac' | 'any',
    supportsOpus: Promise<boolean>,
    data: any,
    legacy: boolean,
    fallback: string,
    usePiped: boolean,
    audioElement?: HTMLAudioElement
  },
  lrcSync: (time: number) => void,
  queue: string[],
  stream: {
    id: string,
    title: string,
    author: string,
    duration: string,
    channelUrl: string
  },
  streamHistory: string[],
  api: {
    piped: string[],
    invidious: string[],
    hyperpipe: string,
    index: number
  },
  loadImage: boolean,
  linkHost: string,
  searchQuery: string,
  superCollectionType: 'featured' | 'collections' | 'channels' | 'feed' | 'playlists',
  actionsMenu: {
    id: string,
    title: string,
    author: string,
    duration: string,
    channelUrl: string
  },
  list: {
    name: string,
    url: string,
    type: string,
    id: string,
    uploader: string,
    thumbnail: string
  },
  downloadFormat: 'opus' | 'wav' | 'mp3' | 'ogg'
} = {
  player: {
    playbackState: 'none',
    hls: {
      on: Boolean(getSaved('HLS')),
      src: (url: string) => {
        // Initialize audio element if not exists
        if (!store.player.audioElement) {
          store.player.audioElement = new Audio();
          store.player.audioElement.crossOrigin = "anonymous";
          
          // Update playback state
          store.player.audioElement.addEventListener('playing', () => {
            store.player.playbackState = 'playing';
          });
          store.player.audioElement.addEventListener('pause', () => {
            store.player.playbackState = 'paused';
          });
        }
        
        // Try direct play first, then fallback to proxy
        const tryPlay = (playUrl: string) => {
          store.player.audioElement!.src = playUrl;
          store.player.audioElement!.play().catch(e => {
            console.error("Playback failed, trying proxy:", e);
            tryPlay(getProxiedUrl(url));
          });
        };
        
        tryPlay(store.player.usePiped 
          ? `${store.api.piped[store.api.index]}/stream?url=${encodeURIComponent(url)}`
          : url
        );
      },
      manifests: [],
      api: [
        'https://pipedapi.kavin.rocks',
        'https://pipedapi-libre.kavin.rocks',
        'https://pipedapi-br.kavin.rocks'
      ].map(url => getProxiedUrl(url))
    },
    hq: Boolean(getSaved('hq')),
    codec: 'opus',
    supportsOpus: (async () => {
      try {
        if (!navigator.mediaCapabilities?.decodingInfo) return true;
        const res = await navigator.mediaCapabilities.decodingInfo({
          type: 'file',
          audio: { contentType: 'audio/webm;codecs=opus' }
        });
        return res.supported;
      } catch (e) {
        console.error("Opus support check failed:", e);
        return true;
      }
    })(),
    data: undefined,
    legacy: !('OffscreenCanvas' in window),
    fallback: getProxiedUrl('https://pipedapi-br.kavin.rocks'),
    usePiped: true
  },
  lrcSync: () => {},
  queue: [],
  stream: {
    id: params.get('s') || '',
    title: '',
    author: '',
    duration: '',
    channelUrl: ''
  },
  streamHistory: [],
  api: {
    piped: [
      'https://pipedapi.kavin.rocks',
      'https://pipedapi-libre.kavin.rocks',
      'https://pipedapi-br.kavin.rocks'
    ].map(url => getProxiedUrl(url)),
    invidious: [
      'https://vid.puffyan.us',
      'https://inv.riverside.rocks',
      'https://yt.artemislena.eu'
    ].map(url => getProxiedUrl(url)),
    hyperpipe: getProxiedUrl('https://hyperpipeapi.onrender.com'),
    index: 0
  },
  loadImage: getSaved('imgLoad') !== 'off',
  linkHost: getSaved('linkHost') || location.origin,
  searchQuery: '',
  superCollectionType: 'featured',
  actionsMenu: {
    id: '',
    title: '',
    author: '',
    duration: '',
    channelUrl: ''
  },
  list: {
    name: '',
    url: '',
    type: '',
    id: '',
    uploader: '',
    thumbnail: ''
  },
  downloadFormat: (getSaved('dlFormat') as 'opus' || 'opus')
};

// Player controls
export const playerControls = {
  play: (url: string) => store.player.hls.src(url),
  pause: () => {
    if (store.player.audioElement) {
      store.player.audioElement.pause();
    }
  },
  setVolume: (volume: number) => {
    if (store.player.audioElement) {
      store.player.audioElement.volume = volume / 100;
    }
  },
  nextApi: () => {
    store.api.index = (store.api.index + 1) % Math.max(
      store.api.piped.length,
      store.api.invidious.length
    );
  }
};
