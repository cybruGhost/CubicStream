import { createSignal, onMount } from "solid-js";
import './UpdatePrompt.css';
import { i18n } from "../lib/utils";

export default function UpdatePrompt(handleUpdate: () => void) {

  const [list, setList] = createSignal([<li>Loading Update</li>]);
  const [fullList, setFullList] = createSignal(['']);
  let dialog!: HTMLDialogElement;

  onMount(async () => {
    const data = await fetch('https://api.github.com/repos/cybruGhost/cubic-stream/commits/main').then(res => res.json());
    const list = data.commit.message.split('-');
    const e = list.map((text: string) => (<li>{text}</li>))
    setList(e);
  });

  const handleFullList = () =>
    fetch('https://raw.githubusercontent.com/cybruGhost/cubic-stream/Changelog.md')
      .then(res => res.text())
      .then(text => text.split('\n'))
      .then(e => setFullList(e));


  return (
    <dialog
      id="changelog"
      ref={dialog}
      open
    >
      <ul>
        {list()}
        <hr />
        {fullList().length > 2 ?
          fullList().map((text: string) => (<li>{text}</li>))
          :
          <li onclick={handleFullList}>{i18n('updater_changelog_full')}</li>
        }
      </ul>
      <span>
        <button onclick={handleUpdate} autofocus>{i18n('updater_update')}</button>
        <button onclick={() => {
          dialog.close();
          dialog.remove();
        }}>{i18n('updater_later')}</button>
      </span>
    </dialog>
  );

}
