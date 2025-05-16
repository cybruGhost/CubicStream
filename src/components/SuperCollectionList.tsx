import { createSignal, onMount } from 'solid-js';
import { getDB, reservedCollections } from '../lib/libraryUtils';
import { superCollectionSelector, superCollectionList } from '../lib/dom';
import { removeSaved, save, superClick } from '../lib/utils';
import ItemsLoader from './ItemsLoader';
import { getSaved } from '../lib/store';
import { createResource } from 'solid-js';
import './rrr.css';

const savedName = getSaved('defaultSuperCollection') as SuperCollection;
if (savedName)
  document.getElementById('r.' + savedName)?.toggleAttribute('checked');

export default function StreamItems() {
  const [db, setDB] = createSignal(getDB());
  const [name, setName] = createSignal(savedName || 'featured');
  const data = () => [name(), db()] as [SuperCollection, Library];
  
  const [dataResource] = createResource(data, async (data) => {
    const [name, db] = data;
    switch (name) {
      case 'featured': return loadFeaturedPls();
      case 'collections': return loadCollections(db);
      case 'feed': return loadFeed(db);
      case 'for_you': return loadForYou(db);
      default: return loadSubList(db, name as APAC);
    }
  });

  onMount(() => {
    addEventListener('dbchange', (e) => {
      const { db, change } = e.detail;
      if (change) setDB(db);
    });

    superCollectionList.addEventListener('click', superClick);
    superCollectionSelector.addEventListener('click', e => {
      const elm = e.target as HTMLInputElement & { value: SuperCollection };
      if (!elm.value) return;

      if (elm.value !== 'for_you') {
        elm.value === 'featured' 
          ? removeSaved('defaultSuperCollection') 
          : save('defaultSuperCollection', elm.value);
      }
      setName(elm.value);
    });
  });

  return (
    <div class="stream-items-container">
      <div class="stream-items-grid">
        <ItemsLoader itemsArray={dataResource() as StreamItem[]} />
      </div>
    </div>
  );
}

function loadForYou(db: Library) {
  if ('favorites' in db) {
    const ids = Object.keys(db.favorites).filter(id => id.length === 11);
    import('../modules/supermix').then(mod => mod.default(ids));
    return '';
  }
  return 'No favorites in library';
}

function loadCollections(db: Library) {
  const keys = Object.keys(db);
  return keys.length 
    ? keys.filter(v => !reservedCollections.includes(v))
          .map(v => ({ type: 'collection', name: v }))
    : 'No Collections in Library';
}

function loadSubList(db: Library, flag: APAC) {
  const error = `No ${flag} in Library`;
  let type = flag;
  let len = 0;
  const special = flag === 'albums' ? 'Album' : 'Artist';

  if (flag === 'albums') {
    type = 'playlists';
    len = 8;
  } else if (flag === 'artists') {
    type = 'channels';
    len = 9;
  }

  if (!Object(db).hasOwnProperty(type)) return error;

  const array = [];
  const pls = db[type] as { [index: string]: Record<'name' | 'uploader' | 'thumbnail' | 'id', string> };

  for (const pl in pls) {
    const name = pls[pl].name;
    if (flag !== type && !name.startsWith(special)) continue;
    if (flag === type && name.startsWith(special)) continue;

    array.push({
      type: type.slice(0, -1),
      name: name.slice(len),
      uploaderName: pls[pl].uploader,
      url: `/${type === 'channels' ? type.slice(0, -1) : type}/` + pls[pl].id,
      thumbnail: pls[pl].thumbnail
    });
  }

  return array.length ? array : error;
}

const loadFeed = (db: Library) => 
  'channels' in db
    ? import('../modules/subfeedGenerator')
        .then(mod => mod.default(
          Object.values(db.channels)
            .filter(c => !c.name.startsWith('Artist -'))
            .map(c => c.id)
        ))
    : 'You have not subscribed to any channels';

const loadFeaturedPls = () => 
  fetch('https://raw.githubusercontent.com/wiki/n-ce/ytify/ytm_pls.md')
    .then(res => res.text())
    .then(text => text.split('\n'))
    .then(data => {
      const array = [];
      for (let i = 0; i < data.length; i += 4) {
        array.push({
          type: 'playlist',
          name: data[i + 1],
          uploaderName: '',
          url: '/playlist?list=' + data[i + 2],
          thumbnail: '/' + data[i + 3]
        });
      }
      return array;
    });