import { Show, createSignal, onMount } from 'solid-js';
import './StreamItem.css';
import { generateImageUrl } from '../lib/imageUtils';
import { store } from '../lib/store';

interface StreamItemProps {
  id: string;
  title: string;
  author?: string;
  duration: string;
  href?: string;
  uploaded?: string;
  channelUrl?: string;
  views?: string;
  img?: string;
  draggable?: boolean;
}

export default function StreamItem(data: StreamItemProps) {
  const [imageUrl, setImageUrl] = createSignal('');
  const [imageError, setImageError] = createSignal(false);
  let parentRef!: HTMLAnchorElement;

  // Handle image loading and fallback logic
  const handleImageError = () => {
    const currentUrl = imageUrl();
    
    if (currentUrl.includes('vi_webp')) {
      // Try JPG version if WEBP fails
      setImageUrl(currentUrl.replace('.webp', '.jpg').replace('vi_webp', 'vi'));
    } else {
      // Fallback to local image
      setImageError(true);
      setImageUrl('/logo192.png');
    }
    
    parentRef.classList.remove('ravel');
  };

  const handleImageLoad = (e: Event) => {
    const img = e.target as HTMLImageElement;
    
    // Check if the image is actually a valid thumbnail (not a placeholder)
    if (img.naturalWidth !== 120) {
      parentRef.classList.remove('ravel');
      return;
    }
    
    if (imageUrl().includes('webp')) {
      // Try JPG version if WEBP is a placeholder
      setImageUrl(imageUrl().replace('.webp', '.jpg').replace('vi_webp', 'vi'));
    } else {
      // Remove invalid item
      parentRef.classList.add('delete');
      parentRef.click();
    }
  };

  // Load image when component mounts if enabled in store
  onMount(() => {
    if (store.loadImage) {
      setImageUrl(generateImageUrl(data.img || data.id, 'mq'));
    }
  });

  return (
    <a
      class={`streamItem ${store.loadImage ? 'ravel' : ''} ${imageError() ? 'error' : ''}`}
      href={data.href}
      ref={parentRef}
      data-id={data.id}
      data-title={data.title}
      data-author={data.author}
      data-channel-url={data.channelUrl}
      data-duration={data.duration}
      data-thumbnail={imageUrl()}
      aria-label={`Video: ${data.title} by ${data.author}`}
    >
      <span class="thumbnail-container">
        <Show when={store.loadImage} fallback={data.duration}>
          <img
            class="thumbnail"
            crossorigin="anonymous"
            onError={handleImageError}
            onLoad={handleImageLoad}
            src={imageUrl()}
            alt={`Thumbnail for ${data.title}`}
            loading="lazy"
          />
          <p class="duration">{data.duration}</p>
        </Show>
      </span>
      <div class="metadata">
        <p class="title" title={data.title}>{data.title}</p>
        <div class="video-info">
          <p class="author">{data.author?.replace(' - Topic', '')}</p>
          <p class="stats">
            {data.views || ''}
            {data.uploaded && ` • ${data.uploaded.replace('Streamed ', '')}`}
          </p>
        </div>
      </div>
      <i class={`icon ri-${data.draggable ? 'draggable' : 'more-2-fill'}`} aria-hidden="true"></i>
    </a>
  );
}