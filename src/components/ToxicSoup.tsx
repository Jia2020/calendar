import React, { useState, useEffect } from 'react';
import { Sparkles, RefreshCw, HeartCrack } from 'lucide-react';
import { ThemeConfig } from '../types';

const TOXIC_QUOTES = [
  "世上99%的事情都能用钱解决，剩下的1%需要更多钱。",
  "有钱人终成眷属，没钱人亲眼目睹。",
  "只要我足够努力，老板明年就能换新车。",
  "钱离开人全天无休，人离开钱寸步难行。",
  "不要看别人表面上一帆风顺，实际上他们背地里也顺风顺水。",
  "钱虽然买不到快乐，但有钱时的痛苦是在大别墅里哭。",
  "一分耕耘一分收获，但那是种地的，不是打工的。",
  "能用钱解决的问题都不是问题，可问题是没钱。",
  "只要你肯吃苦，就会有吃不完的苦。",
  "努力不一定成功，但不努力真的很轻松。",
  "现在的加班，都是为了以后能躺在更好的病房里。",
  "不要跟傻子争论，因为那会让你显得很廉价。",
  "是金子总会发光，但你是老铁。",
  "世上无难事，只要肯放弃。",
  "很多人说我是垮掉的一代，我想说，我还没站起来过呢。",
  "所谓情商高，就是能用委婉的话把对方说成大傻子。",
  "谈恋爱是两个人的事，单身是一群人的事。",
  "舔狗舔到最后，不仅一无所有，还要被说烦。",
  "喜欢一个人就去表白，不被拒绝一下你还真以为自己能脱单。",
  "恋爱就像买衣服，你觉得好看的，往往都买不起。",
  "真正的努力过，才会明白天赋有多重要。",
  "如果你觉得自己很累，别担心，后面还有更累的。",
  "没有人能让你放弃梦想，你自己试试就放弃了。",
  "所谓的成熟，就是发现以前想要的东西，现在不仅得不到，甚至都不想要了。",
  "人生就是个起落落落落落的过程。",
  "得不到就是得不到，别老说你不想要。",
  "如果你觉得生活对你开了一个很大的玩笑，别难过，这只是个开始。",
  "以前我觉得自己是个普通人，现在才明白，我连普通人都算不上。",
  "不要觉得自己一无是处，你至少还能衬托别人的优秀。",
  "如果生活欺骗了你，不要悲伤，明天它还要继续欺骗你。",
  "走自己的路，让别人无路可走。",
  "有些人，一旦错过了，真得谢天谢地。",
  "别低头，绿冠会掉；别流泪，敌人会笑。",
  "人生在世，不如意事十有八九，剩下的一二是极其不如意。",
  "有些事情做不完，就留到明天做吧，明天死了就不用做了。",
  "咸鱼最大的梦想，就是能换个姿势继续躺着。",
  "如果你觉得自己很无能，别担心，你可能真的很无能。",
  "躺平虽然可耻，但真的很有用。",
  "所谓的坚强，就是死撑到最后一刻才发现自己真的撑不住。",
  "人生就是个圈，走来走去，还是回到了原点。",
  "不要觉得明天会更好，因为明天是新的一天，有新的烦恼。",
  "只要你没有梦想，就没有人能打败你。",
  "放弃不难，但坚持真的很酷，不过放弃更轻松。",
  "你总觉得别人在针对你，其实别人根本就不知道你是谁。",
  "生活虽然是一团糟，但只要习惯了，也觉得挺好。",
  "不要和生活死磕，因为你磕不过它。",
  "咸鱼不需要翻身，因为翻身了还是咸鱼，还容易粘锅。",
  "如果你觉得人生很迷茫，说明你还没有到无路可走的地步。",
  "躺着虽然赚不到钱，但至少省钱。",
  "万事开头难，然后中间更难，最后结尾最难。",
  "那些打不倒你的，终究会把你折磨得半死不活。",
  "命运的好坏由自己去创造，可惜你创造不出来。",
  "转角一般不会遇到爱，只会遇到乞丐。",
  "如果你觉得人生很苦，说明你的味觉还没失灵。",
  "时间会冲淡一切，包括你原本就不多的热情。",
  "不要看轻任何人，因为他们可能根本就不想理你。",
  "在错误的路上倒退，其实就是前进。",
  "生活不仅有眼前的苟且，还有读不懂的诗和去不远的远方。",
  "你以为你在过日子，其实是日子在过你。",
  "很多人都在教你如何成功，却没有人教你如何面对失败。",
  "所谓的成长，就是接受自己的平庸。",
  "命运的每一次馈赠，其实都在暗中标好了你付不起的价格。",
  "不要把希望寄托在别人身上，因为别人也想寄托在你身上。",
  "如果世界对你冷酷，那你就用更冷酷的态度去对待它。",
  "现实就像一记耳光，总是在你最清醒的时候打过来。",
  "所有的痛苦，都来自于你那不切实际的幻想。",
  "不要觉得生活欺骗了你，它连骗你的兴趣都没有。",
  "人生就是一趟没有回程的列车，可惜你买的是无座票。",
  "失败不是成功之母，成功才是成功之母，失败只是成功的后妈。",
  "机会只留给有准备的人，但有准备的人往往输给有背景的人。",
  "命里有时终须有，命里无时莫强求，因为强求也求不来。",
  "条条大路通罗马，可有人出生就在罗马，有人出生就是牛马。",
  "如果老天给你关上了一扇门，别等了，他多半去锁窗户了。",
  "别总抱怨老天对你不公平，老天可能压根就不知道你是谁。",
  "大器晚成的前提是，你真的是个“大器”，而不是老了的废柴。",
  "你以为的命中注定，不过是对方权衡利弊后的退而求其次。",
  "岁月没让你变得聪明，它只是让你见识到的傻子变多了。",
  "所有的感同感受，都建立在对方也遭遇了同样倒霉事的前提下。",
  "你以为的触底反弹，往往只是地心引力把你摔得更碎了一点。",
  "你以为的仗义执言，在别人眼里可能只是没情商的胡说八道。",
  "会哭的孩子有奶吃，会干活的孩子有干不完的活。",
  "永远不要试探人性，因为人性在利益面前连五毛钱都不值。",
  "所谓的“大家都是朋友”，意思是在需要垫背的时候算你一个。",
  "当你跌入谷底时，大部分人都在看热闹，剩下的人在往里面扔石头。",
  "低调不一定是谦逊，也可能是因为高调起来会露怯。",
  "别人找你商量事情，通常不是想听你的意见，而是想找个共犯。",
  "讨厌你的人，连你转发个天气预报都觉得你是在装腔作势。",
  "没有绝对的忠诚，只是背叛的筹码还没加到让人心动的程度。",
  "你付出真心的时候，就该做好被对方当成抹布踩的心理准备。",
  "世界上没有真正的感同受，针不扎在别人身上，他们永远觉得那只是个装饰。",
  "最容易让人记住的不是你的恩情，而是你在最后关头拒绝他的那一次。",
  "人生最大的错觉，就是觉得自己与众不同。",
  "你以为的坚持到底，在别人眼里只是死缠烂打。",
  "所谓的“大智若愚”，前提是你得有“大智”，不然你就纯粹是个“愚”。",
  "你现在的独立，全靠当年父母没能给你准备好啃老的资本。",
  "所谓的特立独行，往往是因为合群的成本你付不起。",
  "你以为你在隐藏实力，其实大家早就看穿了你只有这点能耐。",
  "年轻时总想改变世界，中年时才发现连自己乱掉的作息都改不过来。",
  "你之所以过得不快乐，是因为你既无法忍受当下的平庸，又没能力去改变。",
  "别说自己没有追求，你对躺平的追求比谁都执着。",
  "所谓的人间清醒，不过是换了个更绝望的姿势看世界。",
  "你的善良如果没有锋芒，那就不是善良，那是软弱和好欺负。",
  "年轻时以为钱能买到一切，年纪大了才发现，确实可以。",
  "生活最幽默的地方在于，它总是用最昂贵的方式让你明白一些最廉价的道理。",
  "那些劝你格局要大的人，往往在你动了他一毛钱利益时格局变得最小。",
  "所有的选择都有遗憾，所以别纠结了，反正怎么选你都会后悔。",
  "如果你觉得这些话很扎心，说明你还对这个世界抱有不切实际的幻想。",
  "人生就像一场长跑，你拼尽全力跑到了终点，发现别人都是坐直升机来的。"
];

const POSITIVE_QUOTES = [
  "别慌，月亮也正在大海某处迷茫。",
  "只要心里有光，就不用害怕任何黑暗。",
  "把烦躁的心调成静音模式，慢慢来，一切都会好起来的。",
  "生活原本沉闷，但跑起来就会有风。",
  "即使微光如豆，也足以点亮前行的路。",
  "愿你眼有星辰大海，心有繁花似锦。",
  "每天收集一点点美好，存起来抵御以后的漫长岁月。",
  "你要相信，总有一个人会带着满腔的温柔，将你妥帖安放。",
  "允许一切发生，因为生活自有安排。",
  "不管阴晴圆缺，月亮总会在夜空中发光。",
  "岁月漫长，你我皆可温柔以待。",
  "慢慢变好，才是给自己最好的礼物。",
  "只要今天比昨天好，哪怕只是微不足道的一点点，就是进步。",
  "放下执念，不是妥协，而是为了更好地拥抱未来。",
  "愿你的眼角挂着微笑，心中藏着阳光。",
  "不要让昨天的雨，淋湿了今天的太阳。",
  "保持对生活的热爱，才能在这漫长岁月里寻找到属于自己的光芒。",
  "一切都会过去的，如果还没过去，就再等一会儿。",
  "愿你的世界，每天都有温暖的阳光和和煦的微风。",
  "生活不仅眼前的苟且，还有诗和远方，以及好吃的炸鸡。",
  "今天又是元气满满的一天，冲鸭！",
  "努力的意义，就是为了看到更大的世界。",
  "把心放大，烦恼就变小了。",
  "既然来到这个世界，就要活得闪闪发光。",
  "相信自己，你远比自己想象的要强大。",
  "每天告诉自己三遍：我真的很不错！",
  "所有的不开心，都会被明天的阳光晒干。",
  "勇敢地迈出第一步，你会发现前方的风景其实很美。",
  "保持微笑，好运自然会悄悄降临。",
  "无论今天有多糟糕，都不要忘了明天太阳依然会升起。",
  "给自己一个拥抱，感谢自己的坚强与努力。",
  "只要心中有梦想，脚下就永远有力量。",
  "让我们像向日葵一样，永远朝着阳光微笑。",
  "努力的汗水，总有一天会浇灌出成功的花朵。",
  "无论前方有多少艰难险阻，都不要轻言放弃。",
  "保持热爱，奔赴山海，未来可期。",
  "你只管努力，剩下的交给时间去证明。",
  "每一天都是限量版，别让遗憾占据了你的青春。",
  "迎着风奔跑，把烦恼通通甩在身后。",
  "今天的心情是草莓味的，甜甜的。",
  "遇到好吃的东西，就觉得生活真美好呀！",
  "喜欢晚风，喜欢吹着晚风吃着零食。",
  "偶尔做个甜甜的梦，让大脑放个假。",
  "听着喜欢的歌，看着窗外的风景，这一刻岁月静好。",
  "快乐的秘诀很简单，就是把心放宽，把嘴甜。",
  "把每一个平凡的日子，都过得像童话一样精彩。",
  "阳光洒在身上的那一刻，觉得世界无比温暖。",
  "喝一杯热奶茶，幸福感瞬间爆棚。",
  "收集世间所有的美好，只为了哄你开心。",
  "偶尔的放空，是为了更好地积蓄力量。",
  "和喜欢的人在一起，连空气都是甜的。",
  "发现生活中的小确幸，每天都能笑醒。",
  "捏一下肚子上的肉肉，提醒自己也是个有肉感的人呢。",
  "看着毛茸茸的小动物，心都要化了。",
  "穿上新衣服，心情像小鸟一样飞起。",
  "在街角偶遇一只可爱的小猫，能开心一整天。",
  "只要手里有冰淇淋，夏天就没什么大不了的。",
  "把生活调成自己喜欢的频道，播放快乐。",
  "世界上最幸福的事，莫过于睡到自然醒。",
  "愿你不负韶华，活成自己喜欢的模样。",
  "带着感恩的心去生活，你会发现每天都很美。",
  "坚持做自己，你就是独一无二的风景。",
  "用乐观的态度迎接挑战，没有什么过不去的坎。",
  "相信美好的事情即将发生，好运就会接踵而至。",
  "愿你的笑容，像阳光一样灿烂夺目。",
  "每一份经历都是宝贵的财富，它们让我们成长。",
  "坚信自己的选择，勇敢地走下去。",
  "无论遇到什么困难，都要保持那份最初的纯真与善良。",
  "保持一颗感恩的心，珍惜身边每一个爱你的人。",
  "不去比较，不去计较，过好自己的小日子。",
  "愿你的努力，配得上你的野心，也对得起你的初心。",
  "每一天都是一个奇迹，值得我们去好好珍惜。",
  "做一个温暖的人，用自己的光去照亮别人。",
  "相信奇迹，但更相信努力带来的力量。",
  "迎着阳光，大步向前走，不要回头。",
  "愿你历经千帆，归来仍是少年。",
  "用微笑去面对生活，生活也会对你报以微笑。",
  "不管世界如何变化，都要坚守内心的那份宁静与美好。",
  "活在当下，珍惜眼前人，享受每一刻的快乐。",
  "过去的事情就让它过去吧，毕竟明天还要吃好吃的。",
  "不和烂人纠缠，不为烂事生气，开心最重要。",
  "人生短短几十年，怎么开心怎么活。",
  "甩掉包袱，轻装上阵，你会发现天空更蓝。",
  "把心放宽，世界就变小了，快乐也就变多了。",
  "偶尔的糊涂，其实也是一种智慧。",
  "学会和自己和解，原谅曾经犯过错误的自己。",
  "只要身体健康，家人平安，就是最大的幸福。",
  "没有什么是过不去的，时间会给你最好的答案。",
  "懂得放下，才能腾出双手去接住更多的快乐。",
  "生活就像一场旅行，不必在乎目的地，在乎的是沿途的风景和看风景的心情。",
  "别太在意别人的看法，自己开心才是最重要的。",
  "每天给自己一个微笑，告诉自己：今天也很棒！",
  "保持一颗平常心，得之坦然，失之淡然。",
  "阳光总在风雨后，每一次挫折都是成长的垫脚石。",
  "愿你无畏风雨，只做自己。",
  "懂得满足，便是人生最大的财富。",
  "用一颗温柔的心，去包容这个世界的不完美。",
  "微笑面对一切，因为明天又是新的一天。",
  "愿你此生尽兴，赤诚善良，快乐无边！"
];

interface ToxicSoupProps {
  theme: ThemeConfig;
}

export default function ToxicSoup({ theme }: ToxicSoupProps) {
  // 'toxic' or 'positive'
  const [mode, setMode] = useState<'toxic' | 'positive'>(() => {
    const saved = localStorage.getItem('soup_mode');
    if (saved === 'chicken') return 'positive'; // Migration helper
    return (saved as 'toxic' | 'positive') || 'toxic';
  });

  const [quoteIndex, setQuoteIndex] = useState<number>(0);
  const [fade, setFade] = useState(true);

  const currentQuotes = mode === 'toxic' ? TOXIC_QUOTES : POSITIVE_QUOTES;

  // Sync to local storage
  useEffect(() => {
    localStorage.setItem('soup_mode', mode);
  }, [mode]);

  // Compute seeded index when mode or date changes
  useEffect(() => {
    const today = new Date();
    const start = new Date(today.getFullYear(), 0, 0);
    const diff = today.getTime() - start.getTime();
    const oneDay = 1000 * 60 * 60 * 24;
    const dayOfYear = Math.floor(diff / oneDay);
    
    // Seeded selection
    const seed = (today.getFullYear() * 365 + dayOfYear) % currentQuotes.length;
    setQuoteIndex(seed);
  }, [mode, currentQuotes.length]);

  const handleNextQuote = () => {
    setFade(false);
    setTimeout(() => {
      const randIdx = Math.floor(Math.random() * currentQuotes.length);
      setQuoteIndex(randIdx);
      setFade(true);
    }, 200);
  };

  const isDark = theme.id === 'plum';
  const cardBgClass = isDark ? 'bg-[#22191C]/90 border-white/5' : 'bg-white/80 border-black/5 backdrop-blur-md';
  const textTitleClass = isDark ? 'text-rose-400' : 'text-neutral-700';

  return (
    <div 
      className={`rounded-2xl border p-4 shadow-sm flex items-start gap-3.5 transition-all duration-300 relative group overflow-hidden ${cardBgClass}`}
      id="toxic-soup-widget"
    >
      {/* Decorative background pattern */}
      <div className="absolute right-2 -bottom-2 opacity-[0.03] text-black pointer-events-none select-none">
        <Sparkles className="w-24 h-24" />
      </div>

      {/* Mode icon with colored background */}
      <div className={`p-2.5 rounded-xl shrink-0 self-center flex items-center justify-center border transition-colors ${
        mode === 'toxic' 
          ? 'bg-orange-500/10 text-orange-500 border-orange-500/10' 
          : 'bg-emerald-500/10 text-emerald-500 border-emerald-500/10'
      }`}>
        {mode === 'toxic' ? (
          <HeartCrack className="w-5 h-5 animate-pulse" />
        ) : (
          <Sparkles className="w-5 h-5 animate-bounce" />
        )}
      </div>

      <div className="flex-1 min-w-0 pr-8">
        <div className="flex items-center justify-between mb-2">
          <div className="flex items-center gap-1.5">
            <span className={`text-[10px] font-black tracking-widest uppercase font-serif ${textTitleClass}`}>
              {mode === 'toxic' ? '今日毒鸡汤 / SOUP OF THE DAY' : '正能量语录 / POSITIVE ENERGY'}
            </span>
            <span className={`flex h-1.5 w-1.5 rounded-full ${mode === 'toxic' ? 'bg-orange-500' : 'bg-emerald-500'}`} />
          </div>

          {/* Clean Segmented Mode Selector */}
          <div className="flex items-center p-0.5 bg-black/[0.04] dark:bg-white/[0.04] rounded-lg border border-black/[0.03] dark:border-white/[0.03] text-[9px] font-bold shrink-0">
            <button
              onClick={() => { if (mode !== 'toxic') { setFade(false); setTimeout(() => { setMode('toxic'); setFade(true); }, 150); } }}
              className={`px-2 py-0.5 rounded-md transition-all cursor-pointer ${
                mode === 'toxic'
                  ? 'bg-orange-500 text-white shadow-sm'
                  : 'text-neutral-500 hover:text-neutral-800 dark:hover:text-neutral-200'
              }`}
            >
              毒鸡汤 💀
            </button>
            <button
              onClick={() => { if (mode !== 'positive') { setFade(false); setTimeout(() => { setMode('positive'); setFade(true); }, 150); } }}
              className={`px-2 py-0.5 rounded-md transition-all cursor-pointer ${
                mode === 'positive'
                  ? 'bg-emerald-500 text-white shadow-sm'
                  : 'text-neutral-500 hover:text-neutral-800 dark:hover:text-neutral-200'
              }`}
            >
              正能量 🍀
            </button>
          </div>
        </div>
        
        <p className={`text-xs md:text-sm font-serif font-medium leading-relaxed italic transition-opacity duration-200 ${
          fade ? 'opacity-100' : 'opacity-0'
        } ${isDark ? 'text-neutral-200' : 'text-neutral-800'}`}>
          “{currentQuotes[quoteIndex] || '好汤正在熬制中...'}”
        </p>
      </div>

      {/* Button to brew a new pot */}
      <button
        onClick={handleNextQuote}
        className={`absolute right-3 top-1/2 -translate-y-1/2 p-2 rounded-xl transition-all cursor-pointer opacity-40 group-hover:opacity-100 hover:scale-105 active:scale-95 ${
          isDark 
            ? 'hover:bg-white/5 text-[#F3EBF0]' 
            : 'hover:bg-black/5 text-neutral-800'
        }`}
        title="再干一碗"
        id="toxic-soup-refresh-btn"
      >
        <RefreshCw className="w-4 h-4 transition-transform duration-300 group-hover:rotate-180" />
      </button>
    </div>
  );
}
