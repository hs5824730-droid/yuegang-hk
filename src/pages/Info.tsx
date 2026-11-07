import Team from '../components/Team';
import {siteHomeHref} from '../site-home';
import { CompanyIntroduction, RentalCampaign } from '../components/ServiceContent';
import RentalServices, { OfferSection } from '../components/RentalServices';
import { Link, useSearchParams } from 'react-router-dom';
import { ArrowRight, Eye, KeyRound, Languages, MessageCircle, ShieldCheck } from 'lucide-react';
import { useEnquiry } from '../components/Enquiry';
import LeadForm, { isPublicService } from '../components/LeadForm';
import { PageHead } from '../components/parts';
import { CtaBand, Faq } from '../components/sections';
import { IconBadge, Reveal, SmartImg } from '../components/ui';
import { DrawIcon, SplitHero } from '../components/ds';
import { cityName, formatMonth, useConfig, useI18n } from '../i18n';

/* ================================================================ services */
export function Services() {
  return <RentalServices />;
}
export function Offer() {
  const { L, lang } = useI18n();
  const { config } = useConfig();
  const enquire = useEnquiry();
  const end = formatMonth(config.promotion.endMonth, lang);
  return <>
    <div className="ds">
      <SplitHero
        img="/img/hk/harbour-night.webp"
        alt={L('由山頂望維港夜景', 'Victoria Harbour at night from the Peak')}
        pos="50% 60%"
        figure={{ value: 'HK$0', label: L('第一個單位嘅出租佣金', 'Letting commission on your first flat') }}
        kicker={L(`業主限時優惠 · 至 ${end}`, `Owner offer · until ${end}`)}
        title={L('首個單位免出租佣金，第二個單位半價', 'First property free of letting commission, second at half')}
        lead={L('同一位業主，按委託放租嘅次序計；租出之後仲送你免費搬屋。', 'Counted in order for one owner, with free moving included with letting.')}
      >
        <div className="ds-actions">
          <button type="button" className="btn btn-primary rp-offer-cta" onClick={() => enquire({ service: 'letting', offer: true })}>{L('查詢呢項優惠', 'Ask about the offer')}<ArrowRight size={18} aria-hidden /></button>
          <Link className="btn btn-line" to="/services">{L('了解放租同管理', 'Letting & management')}</Link>
        </div>
      </SplitHero>
      <OfferSection />
    </div>
    <section className="section"><div className="wrap"><Faq limit={4} /></div></section>
    <CtaBand />
  </>;
}

/* ================================================================= contact */
export function Contact() {
  const { L } = useI18n();
  const [sp] = useSearchParams();
  const s = sp.get('service');
  const service = isPublicService(s) ? s : 'letting';
  return (
    <>
      <PageHead title={L('留低你嘅聯絡方式', 'Leave your contact details')} lead={L('三步完成：揀服務、話我哋單位喺邊、留低聯絡方式。', 'Three short steps: choose a service, tell us where the property is, and leave your details.')} />
      <section className="section section-tight">
        <div className="wrap contact-grid">
          <div className="card-pad">
            <LeadForm idPrefix="contact" defaultService={service} defaultCity={sp.get('city') || ''} propertyId={sp.get('propertyId') || undefined} propertyAddress={sp.get('address') || undefined} />
          </div>
          <aside className="contact-side">
            <div className="card-pad">
              <h2>{L('發送之後', 'After you send it')}</h2>
              <ul className="icon-list compact">
                <li>
                  <IconBadge>
                    <Languages />
                  </IconBadge>
                  <div>
                    <strong>{L('用你揀嘅語言聯絡', 'Contact in your language')}</strong>
                    <span>{L('粵語、普通話或者英文，由專屬同事跟進。', 'Chinese or English, through a dedicated assistant.')}</span>
                  </div>
                </li>
                <li>
                  <IconBadge>
                    <Eye />
                  </IconBadge>
                  <div>
                    <strong>{L('資料僅團隊可見', 'Only our team can see it')}</strong>
                    <span>{L('聯絡方式只對負責嘅同事開放。', 'Your contact details are visible only to the colleagues handling it.')}</span>
                  </div>
                </li>
              </ul>
            </div>
          </aside>
        </div>
      </section>
    </>
  );
}

/* =================================================================== about */
export function About() {
  const { L, lang } = useI18n();
  const { config } = useConfig();
  const enquire = useEnquiry();
  const values = [
    { Icon: MessageCircle, t: L('清楚溝通', 'Clarity'), d: L('做咩、收幾多、去到邊，我哋用你最易明嘅方式講。', 'Scope, fees and progress, explained in language that works for you.') },
    { Icon: ShieldCheck, t: L('認真跟進', 'Care'), d: L('由睇樓到維修，每件事我哋都跟到尾。', 'From a viewing to a repair, we follow the work through.') },
    { Icon: KeyRound, t: L('尊重託付', 'Respect'), d: L('大決定一定同你商量，唔會自把自為。', 'Owners are involved in important decisions; we work within the agreed scope.') },
  ];
  return <>
    <div className="ds">
      <SplitHero
        img="/img/hk/hk-island.webp"
        alt={L('由尖沙咀望港島', 'Hong Kong Island from Tsim Sha Tsui')}
        pos="50% 60%"
        labels={[{ k: L('服務地區', 'Regions'), v: config.cities.map((c) => cityName(c, lang)).join(' · ') }]}
        figure={{ value: String(config.cities.length), label: L('大區都有服務：港島、九龍、新界、離島', 'regions covered across Hong Kong') }}
        kicker={L('關於悦港', 'About Harbour Joy')}
        title={L('你交俾我哋嘅每層樓，都有人跟到尾', 'Every flat you hand us, followed through')}
        lead={L('你好，我哋係悦港 Harbour Joy。我哋專做香港住宅放租同租務管理，亦幫客人買樓賣樓。同事熟悉本地屋苑同租務，粵語、普通話、英文都講得，有咩都可以搵我哋傾。', 'Hi, we are Harbour Joy. We focus on Hong Kong residential letting and management, and help clients buy and sell too. Our team knows local estates and tenancies, and works in Cantonese, Mandarin and English.')}
      >
        <ul className="ds-split-rows">
          <li><span>{L('現場', 'On site')}</span><strong>{L('睇樓、交收、巡檢由本地團隊處理', 'Viewings, handovers, inspections by the local team')}</strong></li>
          <li><span>{L('溝通', 'Contact')}</span><strong>{L('專人跟進，有進展即刻話你知', 'One colleague keeps you updated')}</strong></li>
          <li><span>{L('決定', 'Decisions')}</span><strong>{L('先講清楚範圍同收費，你點頭先做', 'Scope and fees first, then your call')}</strong></li>
        </ul>
      </SplitHero>

      <section className="ds-sec-tight ds-cream" aria-labelledby="values-title">
        <div className="wrap">
          <h2 id="values-title" className="sr-only">{L('我哋重視嘅三件事', 'What matters to us')}</h2>
          <ul className="ds-values">
            {values.map(({ Icon, t, d }, i) => (
              <Reveal as="li" key={t} delay={i * 80}>
                <DrawIcon><Icon /></DrawIcon>
                <h3>{t}</h3>
                <p>{d}</p>
              </Reveal>
            ))}
          </ul>
        </div>
      </section>

      <Team />

      <section className="ds-sec ds-cream" aria-labelledby="cities-title">
        <div className="wrap ds-cities">
          <div>
            <p className="ds-kicker">{L('服務地區', 'Where we work')}</p>
            <h2 id="cities-title">{L('本地團隊，連接你嘅房產', 'Local teams, close to your property')}</h2>
            <p>{L('以下係重點服務地區。其他香港地區都歡迎查詢，我哋會結合具體地址確認安排。', 'These are our focus cities. Other Hong Kong cities are welcome; arrangements depend on the address.')}</p>
          </div>
          <ul>
            {config.cities.map((city) => (
              <li key={city}>
                <button type="button" onClick={() => enquire({ city, service: 'management' })}>
                  <span>{cityName(city, lang)}</span>
                  <small>{L('查詢呢個地區', 'Ask about this city')}</small>
                  <ArrowRight size={18} aria-hidden />
                </button>
              </li>
            ))}
          </ul>
        </div>
      </section>
    </div>
    <CtaBand />
  </>;
}

/* ================================================================= privacy */
export function Privacy() {
  const { L } = useI18n();
  return (
    <>
      <PageHead title={L('私隱政策及收集個人資料聲明', 'Privacy policy and personal information collection statement')} lead={L('根據《個人資料（私隱）條例》（第 486 章），話你知我哋收咩資料、點用、俾邊個睇，同你有咩權利。', 'Under the Personal Data (Privacy) Ordinance (Cap. 486): what we collect, how we use it, who sees it and your rights.')} />
      <section className="section section-tight">
        <div className="wrap prose narrow">
          <h2>{L('我哋收集咩資料', 'What we collect')}</h2>
          <p>{L('你喺查詢或者需求登記表填寫嘅稱呼、電話、WhatsApp、微信或電郵、單位所在地區同地址、預算或者叫價、單位情況、需要嘅服務同時間、慣用語言同備註。未決定嘅資料可以留空，之後再補。', 'The name, phone, WhatsApp, WeChat or email, flat district and address, budget or asking price, flat details, services and timing, language and notes you enter in enquiries and registrations. Anything undecided can be left blank.')}</p>
          <h2>{L('用嚟做咩', 'Purpose of collection')}</h2>
          <p>{L('只會用嚟回覆你嘅查詢、安排睇樓、提供地產代理服務，同埋跟進你委託我哋嘅事。提供資料係自願嘅，但如果唔提供聯絡方法，我哋就冇辦法覆你。', 'Only to reply to your enquiry, arrange viewings, provide estate agency services and follow up on your instructions. Providing data is voluntary, but without a contact method we cannot reply.')}</p>
          <h2>{L('直接促銷', 'Direct marketing')}</h2>
          <p>{L('未得到你明確同意之前，我哋唔會用你嘅資料做直接促銷，亦唔會將資料提供俾第三方作直接促銷。就算同意咗，你都可以隨時話我哋知唔想再收，我哋唔收任何費用。', 'We will not use your data for direct marketing, or provide it to others for that purpose, without your express consent. You can opt out at any time free of charge.')}</p>
          <h2>{L('邊個會睇到', 'Who can see it')}</h2>
          <p>{L('只有獲授權嘅同事按負責地區同職責查閱。內部通知只包括查詢編號、地區、服務類型同提交時間，唔會包括你嘅聯絡方法。為咗完成交易，資料可能會按需要提供俾律師行、按揭機構或者物業管理處，但只限於你委託嘅事項。', 'Authorised colleagues only, by region and role. Internal alerts carry only the reference, region, service and time — not your contact details. To complete a deal, data may be passed to solicitors, mortgage lenders or building management, only for your instruction.')}</p>
          <h3>{L('廣告成效量度', 'Advertising measurement')}</h3>
          <p>{L('公開網頁會用 Meta Pixel 統計瀏覽次數，同埋喺查詢成功提交後記錄一次轉換。統計喺獨立文件入面執行，唔會讀取你填嘅姓名、電話、微信、地址或者備註。後台、聯絡頁同本機預覽唔會載入追蹤；瀏覽器開咗「請勿追蹤」或者全域私隱控制時亦唔會載入。Meta 仍然可能收到瀏覽器、裝置同網絡資料。', 'Public pages use Meta Pixel to count visits and one conversion after an enquiry is saved. It runs in an isolated document and does not read your name, phone, WeChat, address or notes. It is not loaded on admin, contact or local preview pages, or when Do Not Track or Global Privacy Control is on. Meta may still receive browser, device and network information.')} <a href="https://www.facebook.com/privacy/policy/" target="_blank" rel="noopener noreferrer">{L('Meta 私隱政策', 'Meta Privacy Policy')}</a></p>
          <h2>{L('查閱同改正資料', 'Access and correction')}</h2>
          <p>{L('你有權要求查閱同改正我哋持有嘅你嘅個人資料，亦可以要求刪除。請透過查詢表格或 WhatsApp 聯絡我哋，註明「私隱事務」，我哋會喺法例規定時間內處理。', 'You may request access to and correction of your personal data, or ask us to delete it. Contact us via the enquiry form or WhatsApp, marked “Privacy”; we will respond within the statutory time.')}</p>
          <p className="fine">{L('正式條款以公司最終公布嘅版本為準。', 'The company’s final published terms prevail.')}</p>
        </div>
      </section>
    </>
  );
}

/* ================================================================= credits */
const BYSA3='https://creativecommons.org/licenses/by-sa/3.0/', BY3='https://creativecommons.org/licenses/by/3.0/', BYSA4='https://creativecommons.org/licenses/by-sa/4.0/', BYSA25='https://creativecommons.org/licenses/by-sa/2.5/', CC0='https://creativecommons.org/publicdomain/zero/1.0/';
const commons=(name:string)=>'https://commons.wikimedia.org/wiki/File:'+encodeURIComponent(name.replace(/ /g,'_'));
const WIKI = [
  { file: 'hk/harbour-night.webp', zh: '由山頂望維港夜景（首頁 3D 實景）', en: 'Victoria Harbour at night from the Peak (home 3D scene)', author: 'Benh LIEU SONG (Flickr)', src: commons('Hong Kong Harbour Night 2019-06-11.jpg'), lic: 'CC BY-SA 4.0', licUrl: BYSA4 },
  { file: 'hk/hk-island.webp', zh: '由尖沙咀海旁望港島', en: 'Hong Kong Island from the Tsim Sha Tsui waterfront', author: 'Bernard Spragg. NZ', src: commons('Skyline of Hong Kong, viewed from harbour’s edge in Tsim Sha Tsui; 2014.jpg'), lic: 'CC0', licUrl: CC0 },
  { file: 'hk/kowloon.webp', zh: '維港旁嘅環球貿易廣場', en: 'ICC on Victoria Harbour', author: 'Wilfredor', src: commons('International Commerce Centre on Victoria Harbour.jpg'), lic: 'CC0', licUrl: CC0 },
  { file: 'hk/new-territories.webp', zh: '沙田城門河', en: 'Shing Mun River, Sha Tin', author: 'Wing1990hk', src: commons('Shing Mun River View1 20120911.jpg'), lic: 'CC BY 3.0', licUrl: BY3 },
  { file: 'hk/islands.webp', zh: '東涌新市鎮', en: 'Tung Chung new town', author: 'Dennis Y.C. Wong', src: commons('Tung Chung overlook.jpg'), lic: 'CC BY-SA 2.5', licUrl: BYSA25 },
  { file: 'hk/mid-levels.webp', zh: '半山區住宅', en: 'Mid-Levels residential buildings', author: 'LowameankIAM', src: commons('HK Central view 半山區 Mid-Levels buildings facades July 2018 IX2 02.jpg'), lic: 'CC BY-SA 4.0', licUrl: BYSA4 },
  { file: 'hk/tai-po.webp', zh: '大埔新市鎮', en: 'Tai Po new town', author: 'Wpcpey', src: commons('Tai Po New Town overview 2017.jpg'), lic: 'CC BY-SA 4.0', licUrl: BYSA4 },
  { file: 'hk/taikoo-shing.webp', zh: '太古城', en: 'Taikoo Shing', author: 'WiNG', src: commons('Tai Koo Shing Overview 200909.jpg'), lic: 'CC BY 3.0', licUrl: BY3 },
  { file: 'hk/mei-foo.webp', zh: '美孚新邨', en: 'Mei Foo Sun Chuen', author: 'WiNG', src: commons('Mei Foo Sun Chuen Phase 5.jpg'), lic: 'CC BY-SA 3.0', licUrl: BYSA3 },
  { file: 'hk/city-one.webp', zh: '沙田第一城', en: 'City One Shatin', author: 'WiNG', src: commons('HK Cityone Shatin.jpg'), lic: 'CC BY 3.0', licUrl: BY3 },
  { file: 'hk/whampoa.webp', zh: '黃埔花園', en: 'Whampoa Garden', author: 'Wing1990hk', src: commons('Whampoa Garden Overview 201408.jpg'), lic: 'CC BY 3.0', licUrl: BY3 },
  { file: 'hk/caribbean-coast.webp', zh: '東涌映灣園', en: 'Caribbean Coast, Tung Chung', author: 'Mk2010', src: commons('Caribbean Coast, Tung Chung (Hong Kong).jpg'), lic: 'CC BY-SA 4.0', licUrl: BYSA4 },
  { file: 'hk/kingswood.webp', zh: '天水圍嘉湖山莊', en: 'Kingswood Villas, Tin Shui Wai', author: 'Wikimedia Commons contributor (public domain)', src: commons('Kingswood Villas in 2012.jpg'), lic: 'Public domain', licUrl: commons('Kingswood Villas in 2012.jpg') },
];
const UNSPLASH = [
  { file: 'interior.jpg', zh: '開放式客飯廳', en: 'Open-plan living room', id: '1600607687939-ce8a6c25118c' },
  { file: 'apartment-detail.jpg', zh: '住宅外牆', en: 'Apartment façade', id: '1448630360428-65456885c650' },
  { file: 'home-services/lawn.webp', zh: '剪好嘅草地（家居服務頁）', en: 'Freshly mown lawn (home services page)', id: '1558904541-efa843a96f01' },
  { file: 'home-services/cleaning.webp', zh: '抹窗嘅清潔同事（家居服務頁）', en: 'Cleaner wiping a window (home services page)', id: '1581578731548-c64695cc6952' },
  { file: 'home-services/pet.webp', zh: '小獵犬（家居服務頁）', en: 'Beagle (home services page)', id: '1543466835-00a7907e9de1' },
];

export function Credits() {
  const { L } = useI18n();
  return (
    <>
      <PageHead
        title={L('圖片來源同署名', 'Photo credits')}
        lead={L('網站中地區同住宅風貌圖片嘅來源。佢哋係編輯配圖，同具體樓盤無關。', 'Where the city and home-style photographs on this site come from. They are editorial illustrations, unrelated to any listing.')}
      />
      <section className="section section-tight">
        <div className="wrap">
          <h2 className="credits-h">Wikimedia Commons</h2>
          <ul className="credits">
            {WIKI.map((w) => (
              <li key={w.file}>
                <SmartImg src={`/img/${w.file}`} alt={L(w.zh, w.en)} />
                <div>
                  <strong>{L(w.zh, w.en)}</strong>
                  <span>
                    {L('作者：', 'Author: ')}
                    {w.author}
                  </span>
                  <span>
                    {L('許可：', 'Licence: ')}
                    <a href={w.licUrl} target="_blank" rel="noopener noreferrer">
                      {w.lic}
                    </a>
                  </span>
                  <a href={w.src} target="_blank" rel="noopener noreferrer">
                    {L('查睇原圖', 'View original')}
                  </a>
                </div>
              </li>
            ))}
          </ul>
          <h2 className="credits-h">Unsplash</h2>
          <ul className="credits">
            {UNSPLASH.map((u) => (
              <li key={u.file}>
                <SmartImg src={`/img/${u.file}`} alt={L(u.zh, u.en)} />
                <div>
                  <strong>{L(u.zh, u.en)}</strong>
                  <span>
                    {L('許可：', 'Licence: ')}
                    <a href="https://unsplash.com/license" target="_blank" rel="noopener noreferrer">
                      Unsplash License
                    </a>
                  </span>
                  <a href={`https://images.unsplash.com/photo-${u.id}`} target="_blank" rel="noopener noreferrer">
                    {L('圖片來源連結', 'Source link')}
                  </a>
                </div>
              </li>
            ))}
          </ul>
          <div className="prose credits-note">
            <p>{L('圖片按版面縮放同裁切顯示，冇改動畫面內容。首頁嘅「立體實景」係用相片加上 Depth Anything V2 估算嘅景深整成嘅 3D 浮雕，只作示意，唔係實地測量。Wikimedia 圖片按各自許可條款署名；CC BY-SA 圖片同樣以相同方式共享。', 'Images are scaled and cropped to fit, without altering their content. The home page 3D scenes are reliefs made from these photos plus depth estimated with Depth Anything V2 — illustrative, not measured. Wikimedia images are credited under their licences, and CC BY-SA images are shared alike.')}</p>
            <p>{L('呢啲相片用嚟展示香港唔同地區同屋苑，唔代表任何真實放盤。示範盤用屋苑外觀相，唔係單位內部。', 'These photos illustrate Hong Kong districts and estates and do not depict any real listing. Example listings use estate exteriors, not the flats themselves.')}</p>
          </div>
        </div>
      </section>
    </>
  );
}

export function NotFound() {
  const { L,lang } = useI18n();
  return (
    <PageHead title={L('搵唔到呢一頁', 'Page not found')} lead={L('條連結可能改咗。', 'The link may have changed.')}>
      <a href={siteHomeHref(lang)} className="btn btn-primary">
        {L('回到首頁', 'Back to home')} <ArrowRight size={17} aria-hidden />
      </a>
    </PageHead>
  );
}

