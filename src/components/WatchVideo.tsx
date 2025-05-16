import './watch.css';
import { createSignal, For, onMount, Show } from "solid-js";
import { generateImageUrl } from "../lib/imageUtils";
import { getSaved, store } from "../lib/store";
import { Selector } from "./Settings";
import { handleXtags, proxyHandler, save } from "../lib/utils";
import { loadingScreen, title } from "../lib/dom";
import getStreamData from "../modules/getStreamData";

export default function WatchVideo() {

  const [data, setData] = createSignal({
    video: [] as string[][],
    captions: [] as Captions[]
  });

  let dialog!: HTMLDialogElement;
  let video!: HTMLVideoElement;
  const audio = new Audio();
  const savedQ = getSaved('watchMode');

  onMount(async () => {
    loadingScreen.showModal();

    const supportsAv1 = await navigator.mediaCapabilities
      .decodingInfo({
        type: 'file',
        video: {
          contentType: 'video/mp4; codecs="av01.0.00M.08"',
          bitrate: 1e7,
          framerate: 22,
          height: 720,
          width: 1280
        }
      })
      .then(result => result.supported);

    const data = await getStreamData(store.actionsMenu.id) as unknown as Piped & {
      captions: Captions[],
      videoStreams: Record<'url' | 'type' | 'resolution', string>[],
      audioStreams: Record<'url' | 'mimeType' | 'bitrate', string>[]
    };

    const hasAv1 = data.videoStreams.find(v => v.type.includes('av01'))?.url;
    const hasVp9 = data.videoStreams.find(v => v.type.includes('vp9'))?.url;
    const hasOpus = data.audioStreams.find(a => a.mimeType.includes('opus'))?.url;
    const useOpus = hasOpus && await store.player.supportsOpus;

    const audioArray = handleXtags(data.audioStreams)
      .filter(a => a.mimeType.includes(useOpus ? 'opus' : 'mp4a'))
      .sort((a, b) => parseInt(a.bitrate) - parseInt(b.bitrate));

    if (getSaved('hq')) audioArray.reverse();

    audio.src = proxyHandler(audioArray[0].url);
    audio.currentTime = video.currentTime;
    loadingScreen.close();

    setData({
      video: data.videoStreams
        .filter(f => {
          const av1 = hasAv1 && supportsAv1 && f.type.includes('av01');
          const vp9 = !hasAv1 && f.type.includes('vp9');
          const avc = !hasVp9 && f.type.includes('avc1');
          return av1 || vp9 || avc;
        })
        .map(f => [f.resolution, f.url]),
      captions: data.captions
    });
  });

  return (
    <dialog
      open
      ref={dialog}
      class="watcher"
      style="background: #1e1e1e; color: white; border: none; padding: 1.5rem; border-radius: 10px; width: 80%; max-width: 960px;"
    >
      <video
        ref={video}
        controls
        poster={generateImageUrl(store.actionsMenu.id, 'mq')}
        onPlay={() => {
          audio.play();
          audio.currentTime = video.currentTime;
        }}
        onPause={() => {
          audio.pause();
          audio.currentTime = video.currentTime;
        }}
        onWaiting={() => {
          if (!audio.paused) audio.pause();
        }}
        onTimeUpdate={() => {
          const diff = audio.currentTime - video.currentTime;
          const vpr = video.playbackRate;
          const npr = vpr - diff;
          if (npr < 0) return;
          const rpr = Math.round(npr * 100) / 100;
          if (rpr !== audio.playbackRate)
            audio.playbackRate = rpr;
        }}
        onLoadStart={() => {
          if (!audio.paused) audio.pause();
        }}
        onPlaying={() => {
          if (audio.paused) audio.play();
        }}
        onSeeked={() => {
          audio.currentTime = video.currentTime;
        }}
        onRateChange={() => {
          audio.playbackRate = video.playbackRate;
        }}
        onError={() => {
          if (video.src.endsWith('&fallback')) return;
          const origin = new URL(video.src).origin;
          if (store.api.index < store.api.invidious.length) {
            const proxy = store.api.invidious[store.api.index];
            video.src = video.src.replace(origin, proxy);
            audio.src = audio.src.replace(origin, proxy);
            store.api.index++;
          }
        }}
      >
        <Show when={data().captions.length}>
          <For each={data().captions}>
            {(v) =>
              <track
                src={store.api.invidious[0] + v.url}
                srclang={v.label}
              />
            }
          </For>
        </Show>
      </video>

      <div>
        <button
          onClick={() => {
            audio.pause();
            video.pause();
            dialog.close();
            dialog.remove();
            title.textContent = store.stream.title || 'Now Playing';
          }}
          style="margin-top: 1rem; background: crimson; color: white; padding: 0.5rem 1rem; border: none; border-radius: 5px;"
        >
          Close
        </button>

        <Show when={data().video.length}>
          <Selector
            id="videoCodecSelector"
            label=""
            onChange={_ => {
              video.src = proxyHandler(_.target.value);
              video.currentTime = audio.currentTime;
              if (savedQ)
                save('watchMode', _.target.selectedOptions[0].textContent as string);
            }}
            onMount={_ => {
              if (savedQ)
                video.src = proxyHandler(_.value);
            }}
          >
            <option>Video</option>
            <For each={data().video}>
              {(f) =>
                <option value={f[1]} selected={f[0] === savedQ}>
                  {f[0]}
                </option>
              }
            </For>
          </Selector>
        </Show>

        <br /><br />
        <i>
          Because video streaming consumes a lot of energy, contributing to carbon emissions, please try to watch only what's necessary. When you do stream, select the lowest resolution / bitrate that meets your needs.
        </i>
      </div>
    </dialog>
  );
}
