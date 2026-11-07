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
    { id: 'renovation', Icon: Hammer, img: REN(2), t: L('翻修与维修', 'Renovation & repairs'), s: L('人工半价 · 材料按第三方实价', 'Half-price labour · materials at cost'), d: L('出租前焕新、局部改造，或日常的小修小补。', 'Pre-letting refreshes, makeovers and everyday fixes.'), items: [L('出租前焕新', 'Pre-letting refresh'), L('刷墙、更换地板', 'Repainting, new flooring'), L('厨房与卫浴翻新', 'Kitchens and bathrooms'), L('日常小修与报修', 'Small repairs and call-outs')] },
    { id: 'garden', Icon: Sprout, img: IMG('lawn'), t: L('草坪与园艺', 'Lawn & garden'), s: L('一次性或定期', 'One-off or regular'), d: L('前后院保持整齐，出租、出售或自住都更体面。', 'Front and back yards kept neat, whether you let, sell or live there.'), items: [L('割草与修边', 'Mowing and edging'), L('修剪树篱与灌木', 'Hedge and shrub trimming'), L('除草、施肥', 'Weeding and feeding'), L('季节性整理与绿植清运', 'Seasonal tidy-ups and green waste removal')] },
    { id: 'cleaning', Icon: Sparkles, img: IMG('cleaning'), t: L('清洁服务', 'Cleaning'), s: L('室内与户外', 'Inside and out'), d: L('退租、入住或换季，一次清理到位。', 'End of lease, move-in or a seasonal clean, done in one visit.'), items: [L('退租／入住清洁', 'End-of-lease and move-in cleans'), L('地毯清洗', 'Carpet cleaning'), L('高压冲洗外墙与车道', 'Pressure washing walls and driveways'), L('清理屋檐排水沟', 'Gutter clearing')] },
    { id: 'home-sitting', Icon: House, img: IMG('pet'), t: L('空置与居家照看', 'Vacancy & home sitting'), s: L('房子空着、人在外地也放心', 'Peace of mind while you’re away'), d: L('空置期定期上门，出门期间帮您照看宠物和花草。', 'Regular visits while the home is empty, and care for pets and plants while you travel.'), items: [L('空置期定期上门检查', 'Regular checks while vacant'), L('拍照汇报房屋状况', 'Photo reports on the property'), L('上门喂宠物、换水', 'Feeding pets and fresh water'), L('浇花、收取信件', 'Watering plants, collecting mail')] },
  ];
  const promise = [
    { Icon: HandCoins, n: '50%', t: L('推广期人工费半价', 'Half-price labour'), d: L(`至 ${end}，所有服务的人工费按报价减半。翻修项目的材料按第三方实际价格计算，不另加价。`, `Until ${end}, labour on every service is half the quoted rate. Renovation materials are charged at the supplier’s actual price, with no markup.`) },
    { Icon: ClipboardCheck, n: 'A$0', t: L('免费上门评估', 'Free on-site assessment'), d: L('先看现场，再按项目给出报价清单；您确认后才开工。', 'We see the property first, then give an itemised quote. Work starts only once you approve it.') },
    { Icon: RotateCcw, n: L(`${REWORK_DAYS} 天`, `${REWORK_DAYS} days`), t: L('不满意，先免费返工', 'Not happy? We redo it free'), d: L(`完工后 ${REWORK_DAYS} 天内，对照报价清单指出问题，我们免费返工；返工后仍未达到清单标准，该项人工费不收。`, `Within ${REWORK_DAYS} days of handover, point out anything that doesn’t match the quote checklist and we redo it free. If it still falls short after that, you don’t pay the labour for that item.`) },
  ];
  const steps = [
    [L('留下需求', 'Tell us what you need'), L('城市、地址和想做的服务。', 'City, address and the work in mind.')],
    [L('免费评估', 'Free assessment'), L('上门查看并记录要处理的项目。', 'We visit and note what needs doing.')],
    [L('确认报价', 'Approve the quote'), L('按项目列出清单和价格。', 'An itemised checklist and price.')],
    [L('上门施工', 'Work on site'), L('桉湾团队与合作师傅完成，过程有照片反馈。', 'Done by our team and partner trades, with photo updates.')],
    [L('对照验收', 'Check against the list'), L(`逐项验收，${REWORK_DAYS} 天内可提出返工。`, `Item-by-item sign-off; ask for rework within ${REWORK_DAYS} days.`)],
  ];
  const faq: [string, string][] = [
    [L('半价具体怎么算？', 'How does half price work?'), L(`推广期至 ${end}。评估后的报价中，人工费按正常价格的一半计算。翻修用到的材料按第三方实际价格计，不打折也不加价；草坪、清洁和居家照看这类只需人工的服务，整单按半价计算。`, `The offer runs until ${end}. In your quote, labour is charged at half the normal rate. Renovation materials are at the supplier’s actual price, with no discount and no markup. Labour-only services such as lawn care, cleaning and home sitting are half price in full.`)],
    [L('做完不满意怎么办？', 'What if I’m not happy with the work?'), L(`完工后 ${REWORK_DAYS} 天内告诉我们哪一项没做到报价清单上的标准，我们安排免费返工；返工后仍未达到，该项人工费不收。`, `Tell us within ${REWORK_DAYS} days which item doesn’t meet the quote checklist and we’ll redo it free. If it still falls short, you don’t pay the labour for that item.`)],
    [L('不是房东，自住也可以预约吗？', 'Can owner-occupiers book too?'), L('可以。自住业主、出租房东都可以预约，不需要委托出租或托管。', 'Yes. Owner-occupiers and landlords can both book; you don’t need to appoint us for letting or management.')],
    [L('可以定期上门吗？', 'Can you come regularly?'), L('草坪、清洁和空置照看都可以选一次性或定期，频率在评估时一起确定。', 'Lawn care, cleaning and vacancy checks can be one-off or regular; we agree the frequency at the assessment.')],
    [L('谁来施工？', 'Who does the work?'), L('由桉湾团队与合作师傅完成。评估、报价、进度和验收都由桉湾统一对接。', 'Our own team and partner trades. EUCOVE handles the assessment, quote, updates and sign-off.')],
    [L('宠物照看包括哪些？', 'What does pet care include?'), L('上门喂食、换水和简单照看。遛狗、过夜照看等需求请在登记时说明，由团队确认能否安排。', 'Visits to feed pets, refresh water and check on them. For dog walking or overnight care, mention it when you book and our team will confirm.')],
    [L('服务哪些城市？', 'Which cities do you cover?'), L('当地团队覆盖墨尔本、悉尼、布里斯班等城市，也不限于这些城市。留下地址后，由团队确认安排。', 'Our local teams cover Melbourne, Sydney, Brisbane and more, and we aren’t limited to those cities. Share the address and our team will confirm.')],
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
            <p className="hs-eyebrow"><span className="hs-dot" aria-hidden />{L('房屋服务', 'Home services')}</p>
            <h1 id="hs-title" className="hs-h1">{L('房子里外，', 'Inside and out,')}<br /><span className="hs-accent">{L('交给桉湾打理。', 'leave the house to us.')}</span></h1>
            <p className="hs-lead">{L('翻修维修、草坪园艺、清洁、空置与居家照看。先免费上门评估，再给报价，确认后才开工。', 'Renovation and repairs, lawn and garden, cleaning, vacancy checks and home sitting. A free on-site assessment, an itemised quote, and work only once you approve.')}</p>
            <div className="hs-actions">
              <Link className="hs-btn hs-btn-primary" to={book('house-care')}>{L('预约免费评估', 'Book a free assessment')}<ArrowRight size={18} aria-hidden /></Link>
              <a className="hs-btn hs-btn-ghost" href="#hs-services">{L('看看服务项目', 'See the services')}</a>
            </div>
            <ul className="hs-trust">
              <li><Check size={16} aria-hidden />{L('自住业主、出租房东都可预约', 'For owner-occupiers and landlords')}</li>
              <li><Check size={16} aria-hidden />{L('团队与合作师傅，桉湾统一对接', 'Our team and partner trades, one contact')}</li>
            </ul>
          </div>
          <div className="hs-mosaic" aria-hidden>
            <figure className="hs-m1"><SmartImg src={IMG('lawn')} alt="" eager /></figure>
            <figure className="hs-m2"><SmartImg src={IMG('cleaning')} alt="" eager /></figure>
            <figure className="hs-m3"><SmartImg src={REN(2)} alt="" eager /></figure>
            <div className="hs-offer-chip">
              <span>{L('推广期人工费', 'Labour during launch')}</span>
              <strong>{L('5 折', '50% off')}</strong>
              <small>{L(`至 ${end}`, `Until ${end}`)}</small>
            </div>
          </div>
        </div>
      </section>

      <section className="hs-band" aria-label={L('推广期承诺', 'Launch offer')}>
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
            <p className="hs-kicker">{L('服务项目', 'Services')}</p>
            <h2 id="hs-svc-title" className="hs-h2">{L('四类服务，一个团队对接', 'Four services, one team to deal with')}</h2>
            <p className="hs-sub">{L('选一项直接预约，或留下需求由我们一起评估。', 'Book one directly, or tell us everything and we’ll assess it together.')}</p>
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
                  {id === 'garden' && <a className="hs-garden-jump" href="#hs-garden">{L('看看庭院与露台灵感', 'Explore courtyard & terrace ideas')}<ArrowRight size={15} aria-hidden /></a>}
                  <Link className="hs-card-link" to={book(id)}>{L('预约这项服务', 'Book this service')}<ArrowUpRight size={17} aria-hidden /></Link>
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
            <p className="hs-kicker">{L('服务流程', 'How it works')}</p>
            <h2 id="hs-flow-title" className="hs-h2">{L('先评估再报价，做完对照清单验收', 'Assess, quote, then sign off against the list')}</h2>
          </div>
          <ol className="hs-steps">
            {c.steps.map(([t, d], i) => (
              <Reveal as="li" key={t} delay={i * 60}><span className="hs-step-n">{i + 1}</span><strong>{t}</strong><span>{d}</span></Reveal>
            ))}
          </ol>
          {before === true && after === true && <div className="hs-compare">
            <div className="hs-compare-copy">
              <p className="hs-kicker">{L('翻修参考', 'Renovation')}</p>
              <h3 className="hs-h3">{L('同一空间，改造前后', 'The same room, before and after')}</h3>
              <p>{L('左右拖动对比。右侧为设计示意，不是桉湾完工案例。', 'Drag to compare. The right side is a design concept, not a completed EUCOVE project.')}</p>
              <Link className="hs-card-link" to={book('renovation')}>{L('预约翻修评估', 'Book a renovation assessment')}<ArrowUpRight size={17} aria-hidden /></Link>
            </div>
            <BeforeAfter L={L} />
          </div>}
        </div>
      </section>

      <section className="hs-sec" aria-labelledby="hs-faq-title">
        <div className="wrap hs-faq-grid">
          <div className="hs-head">
            <p className="hs-kicker">{L('常见问题', 'FAQ')}</p>
            <h2 id="hs-faq-title" className="hs-h2">{L('预约前想了解的', 'Before you book')}</h2>
            <p className="hs-sub">{L('还有其他问题，留下联系方式我们来解答。', 'Anything else? Leave your details and we’ll answer.')}</p>
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
              <h2 className="hs-h2">{L('说说房子需要什么', 'Tell us what the house needs')}</h2>
              <p>{L(`推广期人工费半价，至 ${end}。留下联系方式，团队会联系您安排免费评估。`, `Half-price labour until ${end}. Leave your details and our team will arrange a free assessment.`)}</p>
            </div>
            <button type="button" className="hs-btn hs-btn-light" onClick={() => enquire({ service: 'house-care' })}>{L('留下你的联系方式', 'Leave your contact details')}<ArrowRight size={18} aria-hidden /></button>
          </div>
        </div>
      </section>
    </div>
  );
}
