import { useState } from 'react';
import { Link } from 'react-router-dom';
import { ArrowRight, ArrowUpRight, Check, ClipboardCheck, Hammer, HandCoins, House, Plus, RotateCcw, Sparkles, Sprout } from 'lucide-react';
import { formatMonth, useConfig, useI18n } from '../i18n';
import { useEnquiry } from '../components/Enquiry';
import { Reveal, SmartImg } from '../components/ui';
import { BeforeAfter, REN, useLoads } from './Advisory';
import './home-services.css';
import GardenInspiration from './GardenInspiration';

type LFn = (zh: string, en: string) => string;
const IMG = (name: string) => `/img/home-services/${name}.webp`;
const book = (service: string) => `/advisory-registration?service=${service}`;
/** How long after handover an owner can raise unfinished checklist items. */
const REWORK_DAYS = 7;

/** Page content, shared by both sites. */
function content(L: LFn, end: string) {
  const services = [
    { id: 'renovation', Icon: Hammer, img: REN(2), t: L('翻新同維修', 'Renovation & repairs'), s: L('人工半價 · 材料按實價', 'Half-price labour · materials at cost'), d: L('放租前執靚、局部改動，或者日常執執修修，搵我哋就得。', 'Pre-letting refreshes, makeovers and everyday fixes.'), items: [L('放租前執靚', 'Pre-letting refresh'), L('油漆、換地板', 'Repainting, new flooring'), L('廚房同浴室翻新', 'Kitchens and bathrooms'), L('漏水、去水、水電小修', 'Leaks, drains, small plumbing and electrical fixes')] },
    { id: 'garden', Icon: Sprout, img: IMG('lawn'), t: L('露台、平台同天台', 'Balconies, terraces & roofs'), s: L('一次性或定期', 'One-off or regular'), d: L('有露台、平台或者天台嘅單位，打理得好，放租放售都加分。', 'A well-kept balcony, terrace or roof adds appeal whether you let, sell or live there.'), items: [L('植物打理同修剪', 'Plant care and trimming'), L('人造草、地台鋪設', 'Artificial turf and decking'), L('去水位清理', 'Clearing drains'), L('颱風前後檢查', 'Checks before and after typhoons')] },
    { id: 'cleaning', Icon: Sparkles, img: IMG('cleaning'), t: L('清潔服務', 'Cleaning'), s: L('入伙、退租、換季', 'Move-in, move-out, seasonal'), d: L('交吉前後、租客入伙，一次幫你清得乾乾淨淨。', 'Before handover or move-in, cleaned properly in one visit.'), items: [L('入伙／退租大清潔', 'Move-in and move-out deep cleans'), L('冷氣機清洗', 'Air-conditioner cleaning'), L('除蟲、除甲醛', 'Pest control and formaldehyde removal'), L('窗簾、梳化清洗', 'Curtain and sofa cleaning')] },
    { id: 'home-sitting', Icon: House, img: IMG('pet'), t: L('空置同居家睇住', 'Vacancy & home sitting'), s: L('吉屋、人喺外地都放心', 'Peace of mind while you’re away'), d: L('單位吉住嘅時候定期上門睇吓，你去旅行就幫你照顧寵物同盆栽。', 'Regular visits while the home is empty, and care for pets and plants while you travel.'), items: [L('空置期定期上門檢查', 'Regular checks while vacant'), L('影相話你知單位情況', 'Photo reports on the flat'), L('上門餵貓狗、換水', 'Feeding pets and fresh water'), L('淋花、收信、開窗透氣', 'Watering plants, collecting mail, airing the flat')] },
  ];
  const promise = [
    { Icon: HandCoins, n: '50%', t: L('推廣期人工費半價', 'Half-price labour'), d: L(`至 ${end}，所有服務嘅人工費按報價減半。翻新用嘅材料按供應商實價計，唔另外加錢。`, `Until ${end}, labour on every service is half the quoted rate. Renovation materials are charged at the supplier’s actual price, with no markup.`) },
    { Icon: ClipboardCheck, n: 'HK$0', t: L('免費上門評估', 'Free on-site assessment'), d: L('我哋上門睇過先，再逐項報價；你話得先開工。', 'We see the property first, then give an itemised quote. Work starts only once you approve it.') },
    { Icon: RotateCcw, n: L(`${REWORK_DAYS} 天`, `${REWORK_DAYS} days`), t: L('唔滿意？免費返工', 'Not happy? We redo it free'), d: L(`完工後 ${REWORK_DAYS} 天內，對照報價清單指出問題，我哋免費返工；返工後仍未達到清單標準，該項人工費唔收。`, `Within ${REWORK_DAYS} days of handover, point out anything that doesn’t match the quote checklist and we redo it free. If it still falls short after that, you don’t pay the labour for that item.`) },
  ];
  const steps = [
    [L('留低需求', 'Tell us what you need'), L('話我哋地區、地址同想做咩。', 'District, address and the work in mind.')],
    [L('免費評估', 'Free assessment'), L('上門查睇並記錄要處理嘅項目。', 'We visit and note what needs doing.')],
    [L('確認報價', 'Approve the quote'), L('按項目列出清單同價格。', 'An itemised checklist and price.')],
    [L('上門施工', 'Work on site'), L('悦港團隊同合作師傅完成，過程有照片反饋。', 'Done by our team and partner trades, with photo updates.')],
    [L('對照驗收', 'Check against the list'), L(`逐項驗收，${REWORK_DAYS} 天內可提出返工。`, `Item-by-item sign-off; ask for rework within ${REWORK_DAYS} days.`)],
  ];
  const faq: [string, string][] = [
    [L('半價具體點樣算？', 'How does half price work?'), L(`推廣期至 ${end}。評估後嘅報價中，人工費按正常價格嘅一半計算。翻修用到嘅材料按第三方實際價格計，不打折都不加價；露台打理、清潔同睇屋呢類只係人工嘅服務，整單按半價計算。`, `The offer runs until ${end}. In your quote, labour is charged at half the normal rate. Renovation materials are at the supplier’s actual price, with no discount and no markup. Labour-only services such as balcony care, cleaning and home sitting are half price in full.`)],
    [L('做完唔滿意點算？', 'What if I’m not happy with the work?'), L(`完工後 ${REWORK_DAYS} 天內話我哋邊一項做唔到報價清單上嘅標準，我哋安排免費返工；返工後仍未達到，該項人工費唔收。`, `Tell us within ${REWORK_DAYS} days which item doesn’t meet the quote checklist and we’ll redo it free. If it still falls short, you don’t pay the labour for that item.`)],
    [L('唔係業主，自住都可以預約嗎？', 'Can owner-occupiers book too?'), L('可以。自住業主、出租業主都可以預約，唔使委託出租或託管。', 'Yes. Owner-occupiers and landlords can both book; you don’t need to appoint us for letting or management.')],
    [L('可以定期上門嗎？', 'Can you come regularly?'), L('露台打理、清潔同吉屋睇屋都可以揀一次性或者定期，幾耐一次評估嗰陣一齊傾。', 'Balcony care, cleaning and vacancy checks can be one-off or regular; we agree the frequency at the assessment.')],
    [L('邊個嚟開工？', 'Who does the work?'), L('由悦港團隊同合作師傅完成。評估、報價、進度同驗收都由悦港統一對接。', 'Our own team and partner trades. Harbour Joy handles the assessment, quote, updates and sign-off.')],
    [L('寵物睇住包括邊啲？', 'What does pet care include?'), L('上門餵食、換水同簡單睇住。想我哋行狗或者過夜照顧，登記時話我哋知，我哋睇吓安唔安排到。', 'Visits to feed pets, refresh water and check on them. For dog walking or overnight care, mention it when you book and our team will confirm.')],
    [L('服務邊啲地區？', 'Which areas do you cover?'), L('港島、九龍、新界、離島都有做。留低地址，我哋安排附近嘅師傅。', 'Hong Kong Island, Kowloon, the New Territories and the Islands. Share the address and we will arrange a nearby team.')],
  ];
  return { services, promise, steps, faq };
}

/** One layout for both sites: light on eucove.com, dark on eucove.net (body.v2); see home-services.css. */
export default function HomeServices() {
  const { L, lang } = useI18n();
  const { config } = useConfig();
  const end = formatMonth(config.promotion.endMonth, lang);
  const c = content(L, end);
  const enquire = useEnquiry();
  const before = useLoads(REN('before-1')), after = useLoads(REN('after-1'));
  const [open, setOpen] = useState(0);
  return (
    <div className="hs">
      <section className="hs-hero" aria-labelledby="hs-title">
        <div className="wrap hs-hero-grid">
          <div className="hs-hero-copy">
            <p className="hs-eyebrow"><span className="hs-dot" aria-hidden />{L('房屋服務', 'Home services')}</p>
            <h1 id="hs-title" className="hs-h1">{L('層樓大小事，', 'Inside and out,')}<br /><span className="hs-accent">{L('交俾悦港搞掂。', 'leave the flat to us.')}</span></h1>
            <p className="hs-lead">{L('翻新維修、露台打理、清潔、吉屋睇屋。我哋免費上門睇先，再逐項報價，你點頭先開工。', 'Renovation and repairs, balcony care, cleaning, vacancy checks and home sitting. A free on-site assessment, an itemised quote, and work only once you approve.')}</p>
            <div className="hs-actions">
              <Link className="hs-btn hs-btn-primary" to={book('house-care')}>{L('預約免費評估', 'Book a free assessment')}<ArrowRight size={18} aria-hidden /></Link>
              <a className="hs-btn hs-btn-ghost" href="#hs-services">{L('睇吓服務項目', 'See the services')}</a>
            </div>
            <ul className="hs-trust">
              <li><Check size={16} aria-hidden />{L('自住業主、出租業主都可預約', 'For owner-occupiers and landlords')}</li>
              <li><Check size={16} aria-hidden />{L('團隊同合作師傅，悦港統一對接', 'Our team and partner trades, one contact')}</li>
            </ul>
          </div>
          <div className="hs-mosaic" aria-hidden>
            <figure className="hs-m1"><SmartImg src={IMG('lawn')} alt="" eager /></figure>
            <figure className="hs-m2"><SmartImg src={IMG('cleaning')} alt="" eager /></figure>
            <figure className="hs-m3"><SmartImg src={REN(2)} alt="" eager /></figure>
            <div className="hs-offer-chip">
              <span>{L('推廣期人工費', 'Labour during launch')}</span>
              <strong>{L('5 折', '50% off')}</strong>
              <small>{L(`至 ${end}`, `Until ${end}`)}</small>
            </div>
          </div>
        </div>
      </section>

      <section className="hs-band" aria-label={L('推廣期承諾', 'Launch offer')}>
        <div className="wrap">
          <ul className="hs-stats">
            {c.promise.map(({ Icon, n, t, d }, i) => (
              <Reveal as="li" key={t} delay={i * 70}>
                <span className="hs-stat-num">{n}</span>
                <span className="hs-stat-t"><Icon size={18} aria-hidden />{t}</span>
                <p>{d}</p>
              </Reveal>
            ))}
          </ul>
        </div>
      </section>

      <section className="hs-sec" id="hs-services" aria-labelledby="hs-svc-title">
        <div className="wrap">
          <div className="hs-head">
            <p className="hs-kicker">{L('服務項目', 'Services')}</p>
            <h2 id="hs-svc-title" className="hs-h2">{L('四類服務，一個團隊對接', 'Four services, one team to deal with')}</h2>
            <p className="hs-sub">{L('揀一項直接預約，或留低需求由我哋一齊評估。', 'Book one directly, or tell us everything and we’ll assess it together.')}</p>
          </div>
          <ul className="hs-cards">
            {c.services.map(({ id, Icon, img, t, s, d, items }, i) => (
              <Reveal as="li" key={id} delay={i * 70} className="hs-card">
                <figure className="hs-card-media">
                  <SmartImg src={img} alt={L(`${t}（示意）`, `${t} (illustrative)`)} />
                  <span className="hs-card-no">0{i + 1}</span>
                </figure>
                <div className="hs-card-body">
                  <div className="hs-card-title"><span className="hs-icon"><Icon size={20} aria-hidden /></span><h3 className="hs-h3">{t}</h3></div>
                  <p className="hs-tag">{s}</p>
                  <p className="hs-card-d">{d}</p>
                  <ul className="hs-checks">{items.map(item => <li key={item}><Check size={15} aria-hidden />{item}</li>)}</ul>
                  {id === 'garden' && <a className="hs-garden-jump" href="#hs-garden">{L('睇吓庭院同露台靈感', 'Explore courtyard & terrace ideas')}<ArrowRight size={15} aria-hidden /></a>}
                  <Link className="hs-card-link" to={book(id)}>{L('預約呢項服務', 'Book this service')}<ArrowUpRight size={17} aria-hidden /></Link>
                </div>
              </Reveal>
            ))}
          </ul>
        </div>
      </section>

      <GardenInspiration />

      <section className="hs-sec hs-sec-alt" aria-labelledby="hs-flow-title">
        <div className="wrap">
          <div className="hs-head">
            <p className="hs-kicker">{L('服務流程', 'How it works')}</p>
            <h2 id="hs-flow-title" className="hs-h2">{L('先評估再報價，做完對照清單驗收', 'Assess, quote, then sign off against the list')}</h2>
          </div>
          <ol className="hs-steps">
            {c.steps.map(([t, d], i) => (
              <Reveal as="li" key={t} delay={i * 60}><span className="hs-step-n">{i + 1}</span><strong>{t}</strong><span>{d}</span></Reveal>
            ))}
          </ol>
          {before === true && after === true && <div className="hs-compare">
            <div className="hs-compare-copy">
              <p className="hs-kicker">{L('翻修參考', 'Renovation')}</p>
              <h3 className="hs-h3">{L('同一空間，改造前後', 'The same room, before and after')}</h3>
              <p>{L('左右拖動對比。右側為設計示意，唔係悦港完工案例。', 'Drag to compare. The right side is a design concept, not a completed Harbour Joy project.')}</p>
              <Link className="hs-card-link" to={book('renovation')}>{L('預約翻修評估', 'Book a renovation assessment')}<ArrowUpRight size={17} aria-hidden /></Link>
            </div>
            <BeforeAfter L={L} />
          </div>}
        </div>
      </section>

      <section className="hs-sec" aria-labelledby="hs-faq-title">
        <div className="wrap hs-faq-grid">
          <div className="hs-head">
            <p className="hs-kicker">{L('常見問題', 'FAQ')}</p>
            <h2 id="hs-faq-title" className="hs-h2">{L('預約前想了解嘅', 'Before you book')}</h2>
            <p className="hs-sub">{L('仲有其他問題，留低聯絡方式我哋嚟解答。', 'Anything else? Leave your details and we’ll answer.')}</p>
          </div>
          <div className="hs-faq">
            {c.faq.map(([q, a], i) => (
              <div key={q} className={`hs-faq-item${open === i ? ' is-open' : ''}`}>
                <h3 className="hs-faq-q"><button type="button" aria-expanded={open === i} aria-controls={`hs-faq-${i}`} onClick={() => setOpen(open === i ? -1 : i)}>{q}<Plus size={18} aria-hidden /></button></h3>
                <div id={`hs-faq-${i}`} className="hs-faq-a" hidden={open !== i}><p>{a}</p></div>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="hs-cta-wrap">
        <div className="wrap">
          <div className="hs-cta">
            <div>
              <h2 className="hs-h2">{L('說說單位需要咩', 'Tell us what the house needs')}</h2>
              <p>{L(`推廣期人工費半價，至 ${end}。留低聯絡方式，團隊會聯絡你安排免費評估。`, `Half-price labour until ${end}. Leave your details and our team will arrange a free assessment.`)}</p>
            </div>
            <button type="button" className="hs-btn hs-btn-light" onClick={() => enquire({ service: 'house-care' })}>{L('留低你嘅聯絡方式', 'Leave your contact details')}<ArrowRight size={18} aria-hidden /></button>
          </div>
        </div>
      </section>
    </div>
  );
}
