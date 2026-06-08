/**
 * news-service.js
 * Contains feed configuration, fetching logic via rss2json, localStorage cache,
 * normalizer mapping, and a robust MockNewsGenerator fallback.
 */

const SafeStorage = {
  memoryStore: {},
  getItem(key) {
    try {
      return localStorage.getItem(key);
    } catch (e) {
      console.warn(`Local storage read failed for key "${key}":`, e);
      return this.memoryStore[key] || null;
    }
  },
  setItem(key, value) {
    try {
      localStorage.setItem(key, value);
    } catch (e) {
      console.warn(`Local storage write failed for key "${key}":`, e);
      this.memoryStore[key] = value;
    }
  }
};

const GENERAL_SOURCES = [
  { id: 'toi', name: 'Times of India', focus: 'National / General', url: 'https://timesofindia.indiatimes.com/rssfeedstopstories.cms', defaultCategory: 'Politics', homepage: 'https://timesofindia.indiatimes.com' },
  { id: 'ndtv', name: 'NDTV', focus: 'Breaking / Videos', url: 'https://feeds.feedburner.com/ndtvnews-top-stories', defaultCategory: 'Politics', homepage: 'https://www.ndtv.com' },
  { id: 'thehindu', name: 'The Hindu', focus: 'National / Policy', url: 'https://www.thehindu.com/news/feeder/default.rss', defaultCategory: 'Politics', homepage: 'https://www.thehindu.com' },
  { id: 'indianexpress', name: 'Indian Express', focus: 'Politics / Opinions', url: 'https://indianexpress.com/feed/', defaultCategory: 'Politics', homepage: 'https://indianexpress.com' },
  { id: 'hindustantimes', name: 'Hindustan Times', focus: 'Metropolitan / National', url: 'https://www.hindustantimes.com/feeds/rss/home/rssfeed.xml', defaultCategory: 'Politics', homepage: 'https://www.hindustantimes.com' },
  { id: 'news18', name: 'News18', focus: 'Entertainment / Regional', url: 'https://www.news18.com/rss/india.xml', defaultCategory: 'Opinion', homepage: 'https://www.news18.com' },
  { id: 'deccanherald', name: 'Deccan Herald', focus: 'Southern / National', url: 'https://www.deccanherald.com/rss/home', defaultCategory: 'Politics', homepage: 'https://www.deccanherald.com' },
  { id: 'economictimes', name: 'Economic Times', focus: 'Markets / Corporate', url: 'https://economictimes.indiatimes.com/rssfeedstopstories.cms', defaultCategory: 'Business', homepage: 'https://economictimes.indiatimes.com' },
  { id: 'scroll', name: 'Scroll.in', focus: 'Opinion / Culture', url: 'https://scroll.in/feed', defaultCategory: 'Opinion', homepage: 'https://scroll.in' },
  { id: 'mint', name: 'Mint', focus: 'Business / Tech', url: 'https://www.livemint.com/rss/news', defaultCategory: 'Business', homepage: 'https://www.livemint.com' }
];

const AI_SOURCES = [
  { id: 'wired-ai', name: 'Wired AI', focus: 'AI & Future Tech', url: 'https://www.wired.com/feed/category/artificial-intelligence/latest/rss', defaultCategory: 'Applications & Agents', homepage: 'https://www.wired.com/tag/artificial-intelligence/' },
  { id: 'techcrunch-ai', name: 'TechCrunch AI', focus: 'AI Startups & Funding', url: 'https://techcrunch.com/category/artificial-intelligence/feed/', defaultCategory: 'Business & Funding', homepage: 'https://techcrunch.com/category/artificial-intelligence/' },
  { id: 'ai-news', name: 'AI News', focus: 'Industry Insights & Policy', url: 'https://artificialintelligence-news.com/feed/', defaultCategory: 'Regulation & Policy', homepage: 'https://artificialintelligence-news.com' },
  { id: 'venturebeat-ai', name: 'VentureBeat AI', focus: 'Enterprise AI & Models', url: 'https://venturebeat.com/category/ai/feed/', defaultCategory: 'Business & Funding', homepage: 'https://venturebeat.com/category/ai/' },
  { id: 'mit-ai', name: 'MIT Tech Review AI', focus: 'AI Research & Society', url: 'https://www.technologyreview.com/topic/artificial-intelligence/feed/', defaultCategory: 'Models & Research', homepage: 'https://www.technologyreview.com/topic/artificial-intelligence/' },
  { id: 'arxiv-ai', name: 'ArXiv AI', focus: 'Academic Papers & ML', url: 'https://rss.arxiv.org/rss/cs.AI', defaultCategory: 'Models & Research', homepage: 'https://arxiv.org/list/cs.AI/recent' },
  { id: 'infoq-ai', name: 'InfoQ AI', focus: 'AI Development & Eng', url: 'https://feed.infoq.com/ai-ml/news', defaultCategory: 'Applications & Agents', homepage: 'https://www.infoq.com/ai-ml/' }
];

const isAIPage = typeof window !== 'undefined' && window.CHRONICLE_CONFIG && window.CHRONICLE_CONFIG.isAIPage;

const NEWS_SOURCES = isAIPage ? AI_SOURCES : GENERAL_SOURCES;
const CACHE_KEY = isAIPage ? 'chronicle_ai_cache' : 'chronicle_news_cache';
const CACHE_TIME_KEY = isAIPage ? 'chronicle_ai_cache_time' : 'chronicle_news_cache_time';
const CACHE_DURATION_MS = 15 * 60 * 1000; // 15 minutes

class MockNewsGenerator {
  constructor() {
    this.categories = isAIPage
      ? ['Models & Research', 'Business & Funding', 'Ethics & Safety', 'Regulation & Policy', 'Applications & Agents', 'Opinion & Analysis']
      : ["Politics", "Business", "Tech", "Science", "Sports", "Opinion"];
    this.sources = NEWS_SOURCES;
    
    // Static lists of authors for each source
    const generalAuthors = {
      'toi': ['TOI News Network', 'Mumbai Bureau', 'Delia D\'Souza', 'Rajesh Kumar'],
      'ndtv': ['NDTV News Desk', 'Sonia Singh', 'Vishnu Som', 'Pramod Sharma'],
      'thehindu': ['Special Correspondent', 'Suhasini Haidar', 'Ramachandra Guha', 'Mahesh Langa'],
      'indianexpress': ['Express News Service', 'C. Raja Mohan', 'Coomi Kapoor', 'Pratap Bhanu Mehta'],
      'hindustantimes': ['HT Correspondent', 'Shashi Tharoor', 'Barkha Dutt', 'Karan Thapar'],
      'news18': ['News18 Bureau', 'Rajeev Masand', 'Anand Narasimhan', 'Zakka Jacob'],
      'deccanherald': ['DH News Service', 'Sneha Bengani', 'Ramakrishna M.', 'Kalyan Ray'],
      'economictimes': ['ET Bureau', 'Swaminathan Aiyar', 'Udayan Mukherjee', 'Arijit Barman'],
      'scroll': ['Scroll Staff', 'Arundhati Roy', 'Devdutt Pattanaik', 'Girish Kuber'],
      'mint': ['Mint Editor', 'Niranjan Rajadhyaksha', 'Monika Halan', 'Udayan Bose']
    };

    const aiAuthors = {
      'wired-ai': ['Kevin Kelly', 'Steven Levy', 'Will Knight', 'Wired Staff'],
      'techcrunch-ai': ['Devin Coldewey', 'Kyle Wiggers', 'Alex Wilhelm', 'TC Staff'],
      'ai-news': ['James Lu', 'Ryan Morrison', 'AI News Desk', 'Staff Writer'],
      'venturebeat-ai': ['Sharon Goldman', 'Carl Franzen', 'VentureBeat Bureau', 'VB Writer'],
      'mit-ai': ['Melissa Heikkilä', 'Will Douglas Heaven', 'MIT Review Staff', 'Karen Hao'],
      'arxiv-ai': ['Research Bot', 'cs.AI Feed', 'arXiv Staff', 'ML Crawler'],
      'infoq-ai': ['Eran Stiller', 'Srini Penchikala', 'InfoQ Staff', 'Dev Reporter']
    };

    this.authors = isAIPage ? aiAuthors : generalAuthors;

    // Headline pools mapped by source and category
    const generalHeadlinePools = {
      'toi': {
        'Politics': [
          'Municipal Corporation Announces New Infrastructure Plan for Metro Cities',
          'State Assembly Passes Landmark Heritage Conservation Bill',
          'Cabinet Approves Special Allocation for Urban Green Belts'
        ],
        'Business': [
          'India Inc. Welcomes New Retail Expansion Policies',
          'E-Commerce Giants Report Record Festive Season Sales',
          'Real Estate Sector Sees Double Digit Growth in Residential Launches'
        ],
        'Tech': [
          'Smartphone Shipments Surpass Records in Indian Markets',
          'Tech Startups Redefine Digital Delivery Across Metro Hubs',
          'Domestic App Developers Seek Level Playing Field in App Stores'
        ],
        'Science': [
          'National Weather Department Forecasts Normal Monsoon, Easing Agriculture Concerns',
          'Urban Parks Play Crucial Role in Purifying Metropolitan Air',
          'Reforestation Projects in Central India Show Promising Biodiversity Recovery'
        ],
        'Sports': [
          'Indian Cricket Captain Hints at Lineup Changes Ahead of Test Series',
          'Local Athletics Academy Produces Three National Medalists',
          'BCCI Announces Expanded Schedule for Women\'s Domestic Tournaments'
        ],
        'Opinion': [
          'The Changing Face of Our Cities: Balancing Development and Liveability',
          'Cinema and Society: How Modern Storytelling Reflects Indian Reality',
          'The Future of Commuter Transit: Why Metro Rail Is the Only Way Forward'
        ]
      },
      'ndtv': {
        'Politics': [
          'Cabinet Reshuffle Likely Next Week, Senior Leaders Summoned to Capital',
          'Major Security Clearance Granted for Border Road Infrastructure',
          'Parliament Resumes Session Amid Heated Debate Over New Education Draft'
        ],
        'Business': [
          'Gold Prices Slip from Record Highs Amid Global Market Adjustments',
          'Tax Filing Deadline Extended: What Taxpayers Need to Know',
          'Aviation Hubs Report Full Passenger Capacity Recovery This Quarter'
        ],
        'Tech': [
          'Popular Messaging App Rolls Out New Privacy Features for Group Chats',
          'Indian Engineering College Students Develop Low-Cost Medical Wearable',
          'Cyber Response Cell Cautions Citizens Against QR Code Scams'
        ],
        'Science': [
          'Rare Celestial Alignment Visible in Indian Skies Tonight',
          'Marine Biologists Discover New Coral Patch Off Lakshadweep Coast',
          'New High-Altitude Weather Station Commissioned in Ladakh Region'
        ],
        'Sports': [
          'India vs Australia Test Match Tickets Sold Out Within Hours',
          'Grandmaster Praggnanandhaa Wins Invitational Chess Tournament in Europe',
          'National Sports Federation Sets Up High-Performance Center for Boxing'
        ],
        'Opinion': [
          'The Viral Loop: How Social Media Trends Are Changing News Intake',
          'Why Everyday Civic Action Matters More Than Big Policy Statements',
          'Decoding Modern Fandom: The Rise of Virtual Cheerleaders'
        ]
      },
      'thehindu': {
        'Politics': [
          'Supreme Court Issues Directives on Right to Speedy Trials',
          'Bilateral Summit Focuses on Renewable Energy and Maritime Safety',
          'Welfare Schemes for Marginalized Artisans Formally Launched'
        ],
        'Business': [
          'Public Sector Banks Report Substantial Drop in Non-Performing Assets',
          'Micro-Finance Schemes Empower Rural Women Entrepreneurs',
          'Exports of Traditional Handicrafts Rise to High-Growth Trade Zones'
        ],
        'Tech': [
          'National Digital Library Initiative Reaches Milestone of Ten Million Users',
          'Cyber Security Agency Issues Advisory Against Phishing Exploiting Utility Bills',
          'Interoperable Digital Data Standards Proposed for Public Archives'
        ],
        'Science': [
          'Indian Space Research Agency Commences Assembly of Next Solar Probe',
          'New Bird Species Spotted in Western Ghats During Annual Census',
          'Indigenous Wheat Varieties Found to Have High Heat Resistance'
        ],
        'Sports': [
          'National Games Opening Ceremony Showcases India\'s Diverse Cultural Heritage',
          'Teenager Clinches Gold in National Archery Championship',
          'Traditional Wrestling Arenas of Kolhapur Face Funding Hurdles'
        ],
        'Opinion': [
          'Restoring the Rule of Law: Navigating Constitutional Responsibilities',
          'Preserving the Past: Why Heritage Conservation is a Public Duty',
          'The Science of Sharing: Water Disputes and the Need for River Basins'
        ]
      },
      'indianexpress': {
        'Politics': [
          'Investigative Report: The Challenges Facing Primary Education in Rural Districts',
          'Supreme Court Clarifies Land Acquisition Compensation Rules in Landmark Ruling',
          'State Governors and Chief Ministers Meet to Outline Border Infrastructure Plans'
        ],
        'Business': [
          'Foreign Institutional Investors Pump Record Capital into Indian Markets',
          'Manufacturing Sector Output Expands at Fastest Pace in Six Months',
          'Small Scale Industries Seek Credit Guarantee Scheme Enhancements'
        ],
        'Tech': [
          'State Government Launches Unified App for Agricultural Advisory Services',
          'The Startup Capital\'s Shift: Bengaluru and Hyderabad Compete for R&D Centers',
          'New Digital Identity Guidelines Released for Secure Access'
        ],
        'Science': [
          'Indian Climate Experts Warn of Rising Sea Surface Temperatures in Bay of Bengal',
          'Renewable Energy Grid Achieves Record Integration Level',
          'Himalayan Glaciers Under Intensive Drone Surveillance to Track Rate of Retreat'
        ],
        'Sports': [
          'The Making of a Champion: Inside the Training Camp of India\'s Top Javelin Thrower',
          'State Cricket Boards Outline Plans to Revitalize Grassroots Tournaments',
          'National Sports University to Setup Research Laboratory in Manipur'
        ],
        'Opinion': [
          'The Fragile Equilibrium of Indian Federalism: A Critical Assessment',
          'Rethinking Urban Spaces: The Need for Decentralized Infrastructure Planning',
          'The Silent Revolution: How Rural Electrification Has Reshaped Local Livelihoods'
        ]
      },
      'hindustantimes': {
        'Politics': [
          'Metro Rail Phase 3 Construction Approved, Connecting Outlying Suburbs',
          'Municipal Body Launches Online Portal for Fast-Track Building Clearances',
          'Sanitation Infrastructure Upgrade Underway in Sub-Urban Sectors'
        ],
        'Business': [
          'Commercial Real Estate Leasing Touches All-Time High in Financial Hubs',
          'Aviation Sector Registers Double-Digit Growth in Passenger Traffic',
          'Electric Vehicle Sales Register Sharp Upturn Led by Two-Wheelers'
        ],
        'Tech': [
          'Public Wi-Fi Hotspots to Expand Across Metro Stations and Transit Terminals',
          'Electric Vehicle Infrastructure Receives Policy Boost from Union Budget',
          'State Electricity Board Implements AI-Driven Power Load Balancers'
        ],
        'Science': [
          'Clean Air Campaign: How Dust Mitigation Plans Reduced AQI in Capital Cities',
          'Waste-to-Energy Plants Transform Solid Waste Management in Major Cities',
          'New Urban Forests Created on Reclaimed Wastelands in Metropolis'
        ],
        'Sports': [
          'Local Football Club Wins Historic State League Title After Twelve Years',
          'Sports Complex in Suburbs Ready for International Matches',
          'School Sports Infrastructure Initiative Launched by State Board'
        ],
        'Opinion': [
          'Urban Density and Public Health: Rethinking City Designs Post-Pandemic',
          'The Future of Commuter Transit: Why Metro Expansion is Just the Beginning',
          'The Heritage in Our Neighborhood: Connecting Communities to Local Monuments'
        ]
      },
      'news18': {
        'Politics': [
          'New Cultural Center Named After Freedom Fighter Inaugurated in Varanasi',
          'Government Announces National Awards for Craftspersons and Weavers',
          'State Tourism Policy Overhaul Focuses on Ecologically Sensitive Areas'
        ],
        'Business': [
          'Folk Artists Receive Financial Aid Through New Cooperative Banking Scheme',
          'Traditional Toy Industry Registers Strong Export Growth in European Markets',
          'State Silk Co-operative Reports Record Revenue Boost via E-commerce Integration'
        ],
        'Tech': [
          'AI-Powered Translation Tool Helps Preserve Endangered Regional Dialects',
          'Regional Cinema Directors Find Global Audiences on Streaming Platforms',
          'Rural Connectivity Project Reaches Five Thousand Remote Panchayats'
        ],
        'Science': [
          'High-Altitude Medical Camp Successfully Treats Remote Himalayan Villages',
          'Northeast Clean Energy Initiative Installs Solar Mini-Grids in Hill Districts',
          'State Forest Department Implements Radio Tracking for Elephant Corridors'
        ],
        'Sports': [
          'Local Youth Cricket Tournament Draws Scouts from Professional Leagues',
          'Indigenous Martial Arts Included in School Sports Curriculum',
          'Traditional Boat Race Festival Draws Record Crowds in Southern Backwaters'
        ],
        'Opinion': [
          'The Power of Regional Stories: How Indian Cinema is Decentralizing',
          'Bridging the Gap: Why Preservation of Rural Crafts is Economically Vital',
          'The Changing Dynamics of Folk Music Festivals in Digital Age'
        ]
      },
      'deccanherald': {
        'Politics': [
          'State Cabinet Approves Tech Hub Expansion to Tier-2 Cities',
          'Heritage Walk in Bengaluru Old Town Explores Founders\' Vision',
          'Panchayati Raj Leadership Summit Formulates New Water Security Strategy'
        ],
        'Business': [
          'IT Parks in Bengaluru Adopt Net-Zero Water Recycling Systems',
          'Gourmet Coffee Exports from Kodagu Highlands Touch New Peak',
          'Karnataka Silk Spinners Welcome Modern Spinning Machinery Subsidies'
        ],
        'Tech': [
          'Bengaluru Research Lab Unveils Low-Power Processor for Smart Devices',
          'Deep-Tech Incubator at IISc Launches Ten New Biomedical Startups',
          'Bengaluru Aerospace Park Attracts Global Engineering Design Hubs'
        ],
        'Science': [
          'Western Ghats Biodiversity Report Identifies Key Conservation Corridors',
          'Afforestation Drives Restore Native Tree Canopy in Semi-Arid Districts',
          'Unique Canopy Walkway Completed in Western Ghats for Rainforest Studies'
        ],
        'Sports': [
          'Karnataka Cricket Academy Announces Scholarship for Rural Talent',
          'Bengaluru Rider Secures Podium Finish in National Dirt Track Championship',
          'Traditional Mud Wrestling Arena Built in Hubballi to Train Aspirants'
        ],
        'Opinion': [
          'Silicon Valley of India: Maintaining Bengaluru\'s Innovation Edge Amid Challenges',
          'The Western Ghats: A Lifeline Under Threat That Demands Collective Custody',
          'Living Heritage: Why Bengaluru\'s Historic Pete Areas Deserve Preservation'
        ]
      },
      'economictimes': {
        'Politics': [
          'Finance Minister Hints at Rationalization of Goods and Services Tax Slabs',
          'High-Level Committee Formed to Address Corporate Tax Policy Revisions',
          'Government to Frame Unified Policy on Cross-Border Data Flow Regulations'
        ],
        'Business': [
          'RBI Holds Repo Rate, Projects Inflation Path Easing by Next Quarter',
          'Fintech Startup Becomes India\'s Latest Unicorn Following Series C Funding',
          'Corporate India Earnings Excel Expectations Driven by Robust Domestic Demand'
        ],
        'Tech': [
          'Sovereign AI Infrastructure: India Plans Massive Compute Subsidies',
          'Venture Capital Flows Rebound, Targeting Enterprise SaaS and Deeptech',
          'Cloud Services Demand Surges as Large Conglomerates Move to Hybrid Architecture'
        ],
        'Science': [
          'Private Sector Satellites to Launch Onboard Indian Space Agency Rockets',
          'Green Hydrogen Alliance Signs Deals Worth Billions for Coastal Plants',
          'Indian Biopharma Startup Partners for Breakthrough Oncology Trials'
        ],
        'Sports': [
          'Sports Franchises See Valuation Surge Amid Rising Digital Broadcasting Rights',
          'Corporate Sponsorship of Olympic Disciplines Touches Record Highs',
          'Top Industrial Groups Establish Specialized Sports Academies in Rural Hubs'
        ],
        'Opinion': [
          'Navigating Global Headwinds: Why India\'s Macro Stability is Standout',
          'The Digital Payments Revolution: How UPI Reshaped the Informal Economy',
          'The Logic of Credit: Expanding Access to Capital Without Fueling Risky Debt'
        ]
      },
      'scroll': {
        'Politics': [
          'Civil Society Coalition Demands Implementation of Forest Rights Act',
          'Public Hearing Highlights Environmental Concerns Over Coastal Highway Plan',
          'Grassroots Movements Advocate for Stronger Local Self-Government Funding'
        ],
        'Business': [
          'Handloom Cooperatives Struggle to Access Markets Amid Digital Divides',
          'Organic Farming Collectives Create Sustainable Alternatives in Drought Zones',
          'Small Scale Weavers Group to Build Independent Ethical Trade Supply Network'
        ],
        'Tech': [
          'Documentary Filmmakers Turn to Crowdfunding to Maintain Creative Autonomy',
          'The Digital Archive Projects Saving Historical Manuscripts from Decay',
          'Fears of Algorithm Bias Rising Among Gig Workers Operating in Delivery Sectors'
        ],
        'Science': [
          'Study Warns of Groundwater Depletion in Agricultural Heartland',
          'Grassroots Conservators Restore Ancient Water Harvesting Tanks in Central India',
          'Citizen Scientists Complete Mapping of Inland Wetland Systems'
        ],
        'Sports': [
          'Traditional Kusti Wrestlers Fight to Keep Mud Pit Training Relevant',
          'Women Footballers in Rural Bengal Defy Odds to Form Independent League',
          'Rural Athletics Tournaments Offer Glimmer of Hope for Underfunded Runners'
        ],
        'Opinion': [
          'The Politics of Exclusion: Why Environmental Clearances Need Local Consent',
          'Whose Language is it Anyway? The Plurality of Indian Literature',
          'Why the Oral Histories of Nomadic Tribes Must Be Written Down'
        ]
      },
      'mint': {
        'Politics': [
          'Bilateral Trade Deal Signed with European Counterparts, Easing Tariff Barriers',
          'Union Government Proposes Unified Framework for Digital Asset Regulations',
          'Inter-State Goods Transport Rules Liberalized to Ease Logistical Friction'
        ],
        'Business': [
          'Equity Benchmarks Touch All-Time Highs Led by Banking and Auto Stocks',
          'Pharmaceutical Giant Acquires US-Based Research Subsidiary for Two Billion',
          'Consumer Discretionary Spending Remains Resilient Despite Market Shocks'
        ],
        'Tech': [
          'Semiconductor Assembly Facility Groundbreaking Ceremony in Western State',
          'Global Tech Majors Lease Massive Co-working Spaces in Metro Hubs',
          'Venture Debt Gains Favor Among Indian Tech Startups Seeking Capital Runway'
        ],
        'Science': [
          'Clean Energy Transition: Power Grid Upgraded to Handle Variable Solar Feed',
          'Agritech Startup Secures Funding for Satellite-Based Crop Health Monitoring',
          'Private Space Startup Conducts Successful Cryogenic Rocket Engine Test'
        ],
        'Sports': [
          'Commercialization of Indian Kabaddi League Drives Expansion to Rural Markets',
          'Sports Tourism Registers Exponential Growth in Coastal Destinations',
          'Broadcasting Consortium Secures Extended Media Rights in Record-Breaking Deal'
        ],
        'Opinion': [
          'The Fiscal Discipline Dilemma: Balancing Capital Spending and Deficit Targets',
          'Wealth Management in a Growing Economy: Navigating Market Volatility',
          'The Supply Chain Reset: India\'s Bid to Pivot as the Alternate Factory Floor'
        ]
      }
    };

    const aiHeadlinePools = {
      'wired-ai': {
        'Regulation & Policy': [
          'EU Parliament Formalizes Implementation Guidelines for Landmark AI Act',
          'Senate Committee Queries Major AI CEOs on Copyright and Training Data',
          'Global Summit Outlines Safety Accords for Frontier Foundation Models'
        ],
        'Business & Funding': [
          'Nvidia Market Cap Vaults to New Records Amid Massive GPU Infrastructure Demand',
          'Generative AI Startups Raise Record Venture Funding Despite Valuation Skepticism',
          'AI Software Licensing Model Projects Multi-Billion Enterprise Market Surge'
        ],
        'Applications & Agents': [
          'New Open-Source LLM Releases Claim Performance Parity with Proprietary APIs',
          'Web Framework Releases Complete Native Integration for Local Inference',
          'Hardware Startups Unveil Specialized Wearables with Built-In Agents'
        ],
        'Models & Research': [
          'Researchers Map Neural Network Activation Paths to Improve Model Interpretability',
          'AI-Powered Biological Simulation Discovers Target Candidates for Rare Diseases',
          'New Compute-Efficient Architecture Challenges Transformer Domination'
        ],
        'Ethics & Safety': [
          'The Ethics of Synthetic Data: Are We training Models on Hallucinations?',
          'Deepfake Detection Startup Raises Seed Funding Amid Verification Backlash',
          'Research Lab Outlines Red-Teaming Guidelines for Advanced Reasoning Models'
        ],
        'Opinion & Analysis': [
          'Why Open-Source AI is Vital to Democratic Access and Safety',
          'AGI Timelines: Navigating the Gap Between Hype and Actual Engineering',
          'The Silicon Rush: Why Capital Concentration in AI Could Limit Innovation'
        ]
      },
      'techcrunch-ai': {
        'Regulation & Policy': [
          'Copyright Protection Bureau Registers Landmark Claims Against Training Data Scrapers',
          'State Department Establishes Dedicated Taskforce for Autonomous Agents Policy',
          'Municipalities Face Public Backlash Over Automated Algorithmic Benefits Allocation'
        ],
        'Business & Funding': [
          'OpenAI Revenue Crosses New Thresholds Led by ChatGPT Plus Enterprise Subscriptions',
          'Robotics Startup Enters Unicorn Territory Following Series B Lead by Nvidia',
          'Silicon Valley VCs Pivot Capital Allocation Strategies Exclusively to AI Agent Dev'
        ],
        'Applications & Agents': [
          'Developer Tooling Startup Launches Unified API for Multi-Agent Orchestration',
          'New Quantization Algorithms Compress Frontier Models to Run on Smartphones',
          'Cloud Providers Announce Low-Cost Serverless Instances for AI Inference'
        ],
        'Models & Research': [
          'Deep Learning System Designs Novel Crystalline Structures in Minutes',
          'Supercomputing Facility Launches Cluster Exclusively Configured for Neural Nets',
          'Climate Research Center Uses Neural Networks to Model Extreme Weather Patterns'
        ],
        'Ethics & Safety': [
          'Biometric Tracking Framework Faces Legal Scrutiny Over Consent Concerns',
          'Algorithmic Bias Audit Reveals Persistent Disparities in Recruiting Software',
          'Watermarking Standard for Generative Media Adopted by Major Content Platforms'
        ],
        'Opinion & Analysis': [
          'Are We Expecting Too Much? Setting Realistic Milestones for Autonomous Agents',
          'The Creator Class vs. The Training Set: Seeking a Fair Compensation Model',
          'Beyond the LLM: Why the Next Stage of AI Requires Physical Embodiment'
        ]
      },
      'ai-news': {
        'Regulation & Policy': [
          'Bipartisan Coalition Proposes Federal AI Safety Standards Bill',
          'State Regulators Target Algorithmic Pricing Software in Rental Markets',
          'Global Accord Restricts Lethal Autonomous Weapons Systems Development'
        ],
        'Business & Funding': [
          'AI Chip Startups Secure Billions to Challenge Nvidia Dominance',
          'Enterprise AI Deployment Surges Forty Percent Year-Over-Year',
          'Publishing Houses Sign Landmark Multi-Million Content Licensing Deals'
        ],
        'Applications & Agents': [
          'New Multimodal Models Benchmark Human-Level Coding Performance',
          'Open-Source Consortium Releases Ultrafast Local Inference Engine',
          'Database Vector Search Indexing Speeds Up by Tenfold in New Release'
        ],
        'Models & Research': [
          'AI-Designed Enzyme Breaks Down Recyclable Plastics in Hours',
          'Machine Learning Predicts Quantum Phase Transitions with High Precision',
          'Deep Neural Networks Map Previously Unknown Brain Circuitry'
        ],
        'Ethics & Safety': [
          'Watermarking Standards for Synthetic Content Deployed at Scale',
          'Audit Shows Widespread Algorithmic Bias in Automation Systems',
          'Safety Board Proposes Strict Containment Protocols for Agent Experiments'
        ],
        'Opinion & Analysis': [
          'The Risk of Monopoly in Foundation Models: Why Open Access Matters',
          'Redefining Work: How AI Co-pilots Are Reshaping White-Collar Careers',
          'The Alignment Problem: Ensuring AI Systems Remain Beneficial to Humanity'
        ]
      },
      'venturebeat-ai': {
        'Regulation & Policy': [
          'Government Adopts AI Code of Conduct for Public Procurement',
          'Senate Panel Debates National Security Risks of Open-Weights Models',
          'Regulators Probe AI Search Startup Over Copyright Fair Use Claims'
        ],
        'Business & Funding': [
          'Enterprise AI Software Market Poised to Hit $200 Billion by 2028',
          'Database Startup Valued at $5 Billion Following Series D Funding',
          'AI Consulting Services Drive Record Revenue for Major Integrators'
        ],
        'Applications & Agents': [
          'Frontier Model Provider Releases Real-Time Voice API for Developers',
          'New Code Assistant Integration Minimizes Bugs in Large Codebases',
          'Enterprise Agent Platform automates Complex Multi-Step Office Workflows'
        ],
        'Models & Research': [
          'Biomolecular ML Model Predicts Protein Interactions with Unprecedented Speed',
          'Autonomous Lab Facility Speeds Up Material Discovery by 100x',
          'AI Analysis of Deep Space Data Reveals 50 New Exoplanets'
        ],
        'Ethics & Safety': [
          'Study Details Security Exploits targeting Retrieval-Augmented Generation',
          'Large-Scale Audit Exposes Vulnerabilities in Model Safeguard Configurations',
          'Red-Teaming Suite Automated to Detect Hallucinations in Financial Pipelines'
        ],
        'Opinion & Analysis': [
          'The Pragmatic AI: Moving Past the AGI Discussion to Solve Real Problems',
          'Sovereign AI: Why Every Country Needs Independent Computing Infrastructure',
          'The Trust Deficit: Overcoming Hallucinations in Enterprise Workloads'
        ]
      },
      'mit-ai': {
        'Regulation & Policy': [
          'Policy Research Identifies Algorithmic Bias in Criminal Justice System',
          'EU Regulators Detail Fines for Violations of AI Act Transparency Clauses',
          'Federal Trade Commission Investigates Tech Giants Over AI Startup Deals'
        ],
        'Business & Funding': [
          'Startup Accelerator Announces Influx of GPU Compute Grants for Founders',
          'AI Translation Market Expands Rapidly in Emerging Regions',
          'Hardware Conglomerate Partners with AI Lab for In-House Model Customization'
        ],
        'Applications & Agents': [
          'Researchers Unveil Energy-Efficient AI Chip Design Using Photonic Channels',
          'New Benchmarking Suite Evaluates Commonsense Reasoning in LLMs',
          'Open-Source Developer Platform Integrates Local Models by Default'
        ],
        'Models & Research': [
          'AI Model Discovers Class of Antibiotics Able to Kill Resistant Bacteria',
          'Machine Learning System Deciphers Ancient Unreadable Scripts',
          'Deep Learning Predicts Protein Folding Mechanics in Dynamic Environments'
        ],
        'Ethics & Safety': [
          'Deepfake Audio Synthesis Reaches Uncanny Parity, Prompting Ban Calls',
          'FTC Issues Warning Over Unauthorized Personal Data Scraping for Training',
          'Security Analysts Warn of Zero-Day Exploits using Untested AI Packages'
        ],
        'Opinion & Analysis': [
          'The Human Factor: Why AI Systems Require Human-in-the-Loop Oversight',
          'The Carbon Footprint of AI: Addressing the Energy Costs of Training',
          'Copyright Law is Ill-Equipped for Generative AI: Time for Reform'
        ]
      },
      'arxiv-ai': {
        'Regulation & Policy': [
          'Study Evaluates Influence of LLM Personas on Political Discourse',
          'Researchers Propose Watermarking Standards for Synthetic Content',
          'Framework for Auditing Transparency in Algorithmic Decision Systems'
        ],
        'Business & Funding': [
          'Academic Paper Evaluates Economic Impact of Automated Code Assistants',
          'Economic Analysis Details Productivity Gains in Legal AI Workflows',
          'Valuation Framework Proposed for Open-Source Foundation Models'
        ],
        'Applications & Agents': [
          'Paper Introduces Linear-Time Alternative to Traditional Transformers',
          'New Optimization Technique Reduces Fine-Tuning Memory Requirements by 80%',
          'Researchers Release High-Quality Instruction-Tuning Dataset for Math'
        ],
        'Models & Research': [
          'Deep Learning Solver Accelerates Fluid Dynamics Simulations by 1000x',
          'ML Framework Decodes Brain Activity Into Text Representation',
          'Physics-Informed Neural Networks Solve Complex Wave Equations'
        ],
        'Ethics & Safety': [
          'Theoretical Limits of Safety Alignment: Can Models Be 100% Secure?',
          'Adversarial Attacks on Visual Models Highlight Vulnerabilities in Safety Filters',
          'Decentralized Protocol Outlines Trustless Model Auditing and Safe Verification'
        ],
        'Opinion & Analysis': [
          'On the Limits of Autoregressive LLMs for Mathematical Reasoning',
          'The Open-Weights Debate: Balancing Academic Freedom and Misuse Risks',
          'Evaluating Generalization Capabilities in Advanced Machine Learning Models'
        ]
      },
      'infoq-ai': {
        'Regulation & Policy': [
          'Developers Seek Legal Protections Over Automated Code Suggestions',
          'Cyber Security Agency Releases Hardening Guidelines for AI Pipelines',
          'Government IT Department Integrates Open-Source Models for Public Portal'
        ],
        'Business & Funding': [
          'Enterprise Software Giants Race to Integrate Copilot Tooling in Core Suites',
          'IT Leaders Report Significant ROI in Automated Customer Support Pipelines',
          'Venture Capitalists Outline Infrastructure and App Layer Investment Trends'
        ],
        'Applications & Agents': [
          'Popular Web Framework Adds Native Support for Vector Databases',
          'Leading IDE Launches Deep Context Integration for Better Code Completion',
          'New Open Source Framework Simplifies Local Multi-Agent Deployment'
        ],
        'Models & Research': [
          'Neural Network Architectures Optimized for Low-Power IoT Devices',
          'ML Model Analyzes Software Telemetry to Predict Infrastructure Outages',
          'Scientists Use AI Models to Optimize Quantum Computing Error Correction'
        ],
        'Ethics & Safety': [
          'Security Analysis Outlines RAG Vulnerabilities to Prompt Injections',
          'Enterprise Auditing Framework Details Security Controls for AI Execution',
          'Model Provenance Framework Establishes Authenticity Verification Standards'
        ],
        'Opinion & Analysis': [
          'The Rise of the AI-Enhanced Developer: How Roles Are Evolving',
          'Why Prompt Engineering is Evolving Into Multi-Agent Software Architecture',
          'Navigating Data Security Regulations When Deploying LLMs in Enterprise'
        ]
      }
    };

    this.headlinePools = isAIPage ? aiHeadlinePools : generalHeadlinePools;

    // Generic body templates for categories, to build multi-paragraph stories
    this.bodyTemplates = {
      'Politics': [
        [
          '{LOCATION} — In a move that could redefine the administrative landscape, authorities today announced a significant policy measure. The decision, coming after months of stakeholder meetings and legislative debates, has drawn responses across the political spectrum. Observers state that the primary objective is to streamline existing governance systems and bring transparency.',
          'Under the new framework, local authorities will receive greater financial autonomy, allowing them to coordinate resources without waiting for central approvals. Critics, however, warn that without proper checks and balances, the plan could lead to implementation bottlenecks. A detailed regulatory roadmap is expected to be tabled during the upcoming assembly session.',
          '"This represents a decisive step forward in structural reforms," said a senior policy adviser who participated in drafting the guidelines. "We are addressing long-standing systemic blockages and setting the foundation for sustained civic progress." The legislation is scheduled to go into effect starting next month.'
        ],
        [
          '{LOCATION} — The Legislative Committee has officially tabled its report, proposing comprehensive amendments to existing statutes. The proposal aims to update rules drafted decades ago to better suit modern administrative demands. This reform is expected to impact several public services and local administrative bodies.',
          'Key clauses in the proposed amendments focus on digitization of records and introducing fixed timelines for clearing public requests. A bipartisan group of legislators has expressed cautious optimism, although some sections are urging for public consultations before finalized approval. Public forums will be hosted next week to gather feedback.',
          '"We are aiming for a citizen-centric system that minimizes bureaucratic delays," the committee chairperson remarked. "The initial reception is encouraging, and we are committed to refining the details based on inputs from all sectors of society."'
        ]
      ],
      'Business': [
        [
          '{LOCATION} — The financial sector reacted positively today as key performance indicators showed strong resilience. Analysts point to steady consumer demand and favorable regulatory adjustments as key catalysts driving this momentum. Market sentiment remains bullish, with major indices closing in green.',
          'Several corporate conglomerates have announced plans to ramp up capital expenditures for the upcoming quarters, reflecting confidence in the domestic market. However, global inflationary pressures and supply chain fluctuations continue to pose minor risks. Economists advise a balanced approach, focusing on operational efficiencies.',
          '"The fundamentals of the economy remain robust," noted a leading financial strategist. "While external risks exist, our domestic consumption base provides a reliable cushion. We expect this expansionary phase to continue through the year."'
        ],
        [
          '{LOCATION} — A major corporate consolidation was announced today, marking one of the largest transactions in the sector this fiscal year. The strategic merger is anticipated to unlock operational synergies and expand retail presence across previously untapped regions. Investors have reacted favorably to the joint announcement.',
          'The integration process, which is estimated to take six to nine months, will combine supply chains and digital distribution networks. Executives stated that there will be no immediate reduction in workforce, and the focus will remain on expansion. Regulatory clearances are currently under review by competitive watchdogs.',
          '"This transaction aligns perfectly with our long-term growth trajectory," said a spokesperson for the acquiring entity. "By combining our capabilities, we can deliver superior value to consumers and expand our market reach significantly."'
        ]
      ],
      'Tech': [
        [
          '{LOCATION} — Technologists and industry experts gathered today at the annual innovation summit to discuss the rollout of next-generation digital frameworks. The focus remained on high-speed computing, data privacy, and the expanding footprint of artificial intelligence in everyday devices. The mood was optimistic about localized research.',
          'Startups and established tech firms are collaborating on developing low-power processors designed specifically for decentralized tasks. This shift is expected to reduce dependency on foreign hardware and cut costs for local businesses. Several pilot projects are slated to launch in selected academic incubators.',
          '"We are witnessing a democratization of technology," observed a venture capitalist. "The emphasis is shifting from generic global solutions to specialized, locally optimized systems. The engineering talent available here is perfectly positioned to lead this wave."'
        ],
        [
          '{LOCATION} — A groundbreaking software application designed to simplify access to public utilities has crossed a major user milestone. The platform, built using open-source protocols, has successfully onboarded millions of users within its first phase of deployment. Its success is being viewed as a model for civic tech initiatives.',
          'The system offers multi-lingual support, real-time tracking, and automated assistance to guide users through complex applications. Developers are already working on the next iteration, which will include offline capabilities for remote areas. Data safety and secure identity checks remain core to the app\'s design.',
          '"Our goal was to bridge the digital divide by making public services accessible with a single click," the lead developer explained. "The response has been overwhelming, and it highlights the massive potential of public-private partnerships in technology."'
        ]
      ],
      'Science': [
        [
          '{LOCATION} — Research teams have published a comprehensive study highlighting recent breakthroughs in environmental restoration and climate adaptation. The paper, appearing in a prestigious scientific journal, details how localized conservation practices can reverse degradation patterns. The findings have broad implications.',
          'The study highlights a significant recovery in regional biodiversity and improved soil quality following the implementation of traditional water harvesting methods. Experts believe these practices can be scaled to other semi-arid zones to combat desertification. Financial grants have been approved to expand the research area.',
          '"The data shows that integrating traditional knowledge with modern ecological science produces sustainable outcomes," the lead researcher stated. "It is a cost-effective strategy that empowers local communities while preserving vital natural resources."'
        ],
        [
          '{LOCATION} — A state-of-the-art laboratory facility was inaugurated today, dedicated to conducting advanced research in renewable energy systems. The center will focus on improving solar cell efficiency and developing sustainable battery storage technologies. Researchers from top institutions will collaborate on these projects.',
          'The facility houses advanced testing chambers and simulation suites, enabling rapid prototyping of green technologies. Private energy firms have already signed agreements to license the technologies developed here, accelerating commercial application. Funding has been secured for the next five years.',
          '"We are creating an ecosystem where academic research directly translates into industry solutions," the director remarked. "To transition to clean energy, we must innovate locally to address specific grid integration challenges."'
        ]
      ],
      'Sports': [
        [
          '{LOCATION} — The national tournament reached an exciting conclusion today as athletes delivered outstanding performances. The event, held before a capacity crowd, saw several records broken and new talent emerging onto the national scene. Coaches and scouts expressed immense satisfaction with the standards displayed.',
          'The state federation announced a new sponsorship deal that will secure training funds and international exposure for the top performers. This financial backing is expected to boost preparations for the upcoming continental games. Grassroots programs will also receive a portion of the development grant.',
          '"The level of talent we saw today is a testament to the hard work put in at the youth levels," said a former national champion. "With proper training facilities and consistent support, these young athletes can compete on the global stage and win medals."'
        ],
        [
          '{LOCATION} — A specialized training camp commenced today, bringing together top coaches and analysts to prepare regional teams for the national championships. The camp focuses on scientific training methodologies, nutrition, and mental conditioning. The initiative aims to elevate performance benchmarks.',
          'Athletes will undergo comprehensive physical assessments, and customized regimes will be designed for each individual. The management has also incorporated video analysis tools to refine techniques and address tactical weaknesses. The camp is scheduled to run for three weeks.',
          '"We are leaving no stone unturn in our preparation," the head coach commented. "Modern sports require a scientific approach, and integrating analytics with physical training is crucial for achieving peak performance."'
        ]
      ],
      'Opinion': [
        [
          '{LOCATION} — In an era dominated by rapid urbanization and digital connectivity, the preservation of our cultural heritage has taken on a new urgency. While modern infrastructure is vital, the historic character of our public spaces defines our collective identity. A balanced approach is essential for sustainable progress.',
          'Too often, development plans treat historic areas as obstacles rather than assets. Integrating heritage conservation with urban renewal projects not only preserves history but also enhances tourism and community spaces. Cities that successfully blend the old with the new show higher indicators of social cohesion.',
          'It is time for urban planners, historians, and local citizens to work in tandem. A city that forgets its past cannot fully appreciate its future. Active public participation in heritage projects is the first step toward building a truly liveable metropolitan environment.'
        ],
        [
          '{LOCATION} — The shift in how we consume information has fundamentally altered public discourse, emphasizing immediate reaction over deep analysis. While digital platforms democratize voices, they also tend to fragment discussions. Restoring nuance to public debate is one of the key challenges of our time.',
          'Healthy societies rely on spaces where complex issues can be discussed without devolving into polarization. Long-form journalism, community forums, and academic public engagements play a vital role in providing this depth. Encouraging media literacy in educational institutions is critical to building critical thinking.',
          'We must actively seek out diverse perspectives and engage in constructive dialogue. Nuance is not a sign of hesitation; it is the hallmark of a mature society capable of navigating complex moral and political realities.'
        ]
      ]
    };
  }

  getRandomCategoryForSource(sourceId) {
    const source = this.sources.find(s => s.id === sourceId);
    if (!source) return 'Politics';
    
    // Weighted selection: default category gets 50% chance, others get shared
    if (Math.random() < 0.5) {
      return source.defaultCategory;
    }
    const filteredCategories = this.categories.filter(c => c !== source.defaultCategory);
    return filteredCategories[Math.floor(Math.random() * filteredCategories.length)];
  }

  getRandomHeadline(sourceId, category) {
    const sourcePool = this.headlinePools[sourceId];
    if (!sourcePool || !sourcePool[category]) {
      return `New developments reported in ${category} sector`;
    }
    const headlines = sourcePool[category];
    return headlines[Math.floor(Math.random() * headlines.length)];
  }

  getRandomAuthor(sourceId) {
    const sourceAuthors = this.authors[sourceId];
    if (!sourceAuthors) return 'Staff Reporter';
    return sourceAuthors[Math.floor(Math.random() * sourceAuthors.length)];
  }

  getRandomSummary(category) {
    const summaries = {
      'Politics': 'A comprehensive overview of recent policy amendments, legislative debates, and the governance frameworks shaping administrative decisions.',
      'Business': 'Market updates, corporate transactions, and economic trends highlighting domestic growth indices and strategic business moves.',
      'Tech': 'Key innovations, startup updates, and digital infrastructure developments transforming technological operations and access.',
      'Science': 'Scientific research, ecological findings, and weather reports analyzing climate adaptation and technology applications.',
      'Sports': 'Highlights from recent national tournaments, training camps, and policy directives promoting grassroots athletic development.',
      'Opinion': 'An in-depth perspective on societal shifts, policy implications, and cultural conservation strategies in a fast-paced environment.'
    };
    return summaries[category] || 'Latest updates and comprehensive coverage of recent developments.';
  }

  getRandomContentParagraphs(title, category, sourceName) {
    const templates = this.bodyTemplates[category] || this.bodyTemplates['Politics'];
    const selectedTemplate = templates[Math.floor(Math.random() * templates.length)];
    
    const locations = ['NEW DELHI', 'MUMBAI', 'BENGALURU', 'CHENNAI', 'KOLKATA', 'HYDERABAD'];
    const randomLoc = locations[Math.floor(Math.random() * locations.length)];
    
    return selectedTemplate.map(p => 
      p.replace(/{LOCATION}/g, randomLoc)
       .replace(/{TITLE}/g, title)
       .replace(/{SOURCE}/g, sourceName)
    );
  }

  generateFeed(count = 24) {
    const feeds = [];
    
    // Seed with dynamic dates
    for (let i = 0; i < count; i++) {
      const sourceObj = this.sources[i % this.sources.length];
      const source = sourceObj.id;
      const category = this.getRandomCategoryForSource(source);
      
      const title = this.getRandomHeadline(source, category);
      const author = this.getRandomAuthor(source);
      
      // Dynamic image tags
      const imgTags = { 
        "Tech": "photo-1518770660439-4636190af475", 
        "Business": "photo-1590283603385-17ffb3a7f29f", 
        "Politics": "photo-1540910419892-4a36d2c3266c", 
        "Sports": "photo-1508098682722-e99c43a406b2", 
        "Science": "photo-1451187580459-43490279c0fa", 
        "Opinion": "photo-1455390582262-044cdead277a" 
      };
      
      const randomOffset = Math.floor(Math.random() * 20) + 1;
      const unsplashId = imgTags[category] || "photo-1504711434969-e33886168f5c";
      
      // Unsplash cache-busted image URL
      const imageUrl = `https://images.unsplash.com/${unsplashId}?w=800&auto=format&fit=crop&q=80&sig=${i}-${randomOffset}`;
      const publishedAt = new Date(Date.now() - (i * 25 * 60 * 1000) - (randomOffset * 60 * 1000)).toISOString();
      const summary = this.getRandomSummary(category);
      const content = this.getRandomContentParagraphs(title, category, sourceObj.name);

      feeds.push({
        id: `mock-${sourceObj.id}-${i}-${Math.abs(this.hashCode(title)).toString(36)}`,
        source: sourceObj.name,
        title: title,
        author: author,
        publishedAt: publishedAt,
        link: sourceObj.homepage,
        category: category,
        summary: summary,
        content: content.join('\n\n'),
        image: imageUrl,
        isMock: true
      });
    }
    
    return feeds.sort((a, b) => new Date(b.publishedAt) - new Date(a.publishedAt));
  }

  hashCode(str) {
    let hash = 0;
    for (let i = 0; i < str.length; i++) {
      hash = (hash << 5) - hash + str.charCodeAt(i);
      hash |= 0;
    }
    return hash;
  }
}

const NewsService = {
  SOURCES: NEWS_SOURCES,
  mockGenerator: new MockNewsGenerator(),

  hashCode(str) {
    if (!str) return 'id-' + Math.random().toString(36).substr(2, 9);
    let hash = 0;
    for (let i = 0; i < str.length; i++) {
      hash = (hash << 5) - hash + str.charCodeAt(i);
      hash |= 0;
    }
    return Math.abs(hash).toString(36);
  },

  cleanHtml(html) {
    if (!html) return '';
    const tempDiv = document.createElement('div');
    tempDiv.innerHTML = html;
    
    // Remove scripts and elements we don't want
    const scripts = tempDiv.getElementsByTagName('script');
    for (let i = scripts.length - 1; i >= 0; i--) {
      scripts[i].parentNode.removeChild(scripts[i]);
    }
    
    return tempDiv.textContent || tempDiv.innerText || '';
  },

  extractImage(item, category) {
    if (item.enclosure && item.enclosure.link && item.enclosure.type && item.enclosure.type.startsWith('image/')) {
      return item.enclosure.link;
    }
    if (item.enclosure && item.enclosure.link && (item.enclosure.link.endsWith('.jpg') || item.enclosure.link.endsWith('.png') || item.enclosure.link.endsWith('.jpeg') || item.enclosure.link.endsWith('.webp'))) {
      return item.enclosure.link;
    }
    if (item.thumbnail) {
      return item.thumbnail;
    }
    // Check inside description/content
    const descMatch = (item.description || '').match(/<img[^>]+src="([^">]+)"/);
    if (descMatch && descMatch[1]) {
      return descMatch[1];
    }
    const contentMatch = (item.content || '').match(/<img[^>]+src="([^">]+)"/);
    if (contentMatch && contentMatch[1]) {
      return contentMatch[1];
    }
    
    // High-quality unsplash fallback
    const imgTags = { 
      "Tech": "photo-1518770660439-4636190af475", 
      "Business": "photo-1590283603385-17ffb3a7f29f", 
      "Politics": "photo-1540910419892-4a36d2c3266c", 
      "Sports": "photo-1508098682722-e99c43a406b2", 
      "Science": "photo-1451187580459-43490279c0fa", 
      "Opinion": "photo-1455390582262-044cdead277a",
      "Models & Research": "photo-1451187580459-43490279c0fa",
      "Business & Funding": "photo-1590283603385-17ffb3a7f29f",
      "Ethics & Safety": "photo-1504711434969-e33886168f5c",
      "Regulation & Policy": "photo-1540910419892-4a36d2c3266c",
      "Applications & Agents": "photo-1518770660439-4636190af475",
      "Opinion & Analysis": "photo-1455390582262-044cdead277a"
    };
    const unsplashId = imgTags[category] || "photo-1504711434969-e33886168f5c";
    return `https://images.unsplash.com/${unsplashId}?w=800&auto=format&fit=crop&q=80`;
  },

  detectAICategory(item, defaultCategory) {
    const text = ((item.title || '') + ' ' + (item.description || '') + ' ' + (item.content || '') + ' ' + (item.categories || []).join(' ')).toLowerCase();
    
    if (text.includes('eu ai act') || text.includes('parliament') || text.includes('hearing') || text.includes('regulation') || text.includes('policy') || text.includes('senate') || text.includes('bill') || text.includes('government') || text.includes('ftc') || text.includes('copyright') || text.includes('lawsuit') || text.includes('sue') || text.includes('legal') || text.includes('guidelines') || text.includes('regulatory') || text.includes('auditing')) {
      return 'Regulation & Policy';
    }
    if (text.includes('bias') || text.includes('ethical') || text.includes('ethics') || text.includes('safety') || text.includes('alignment') || text.includes('deepfake') || text.includes('misinformation') || text.includes('hallucinate') || text.includes('synthetic data') || text.includes('hallucinations') || text.includes('watermarking') || text.includes('risks')) {
      return 'Ethics & Safety';
    }
    if (text.includes('nvidia') || text.includes('stock') || text.includes('raise') || text.includes('fund') || text.includes('billion') || text.includes('million') || text.includes('startup') || text.includes('funding') || text.includes('venture') || text.includes('vc') || text.includes('revenue') || text.includes('acquire') || text.includes('acquisition') || text.includes('market cap') || text.includes('enterprise') || text.includes('business') || text.includes('commercial') || text.includes('finance') || text.includes('cooperative') || text.includes('banking') || text.includes('deals') || text.includes('ipo')) {
      return 'Business & Funding';
    }
    if (text.includes('agent') || text.includes('tool') || text.includes('app') || text.includes('copilot') || text.includes('assistant') || text.includes('framework') || text.includes('api') || text.includes('robot') || text.includes('autonomous') || text.includes('device') || text.includes('wearable') || text.includes('development') || text.includes('software') || text.includes('vector') || text.includes('indexing') || text.includes('integration') || text.includes('platforms')) {
      return 'Applications & Agents';
    }
    if (text.includes('paper') || text.includes('arxiv') || text.includes('research') || text.includes('model') || text.includes('llm') || text.includes('gpt') || text.includes('transformer') || text.includes('neural') || text.includes('dataset') || text.includes('training') || text.includes('weights') || text.includes('benchmark') || text.includes('photonic') || text.includes('compute-efficient') || text.includes('linear-time')) {
      return 'Models & Research';
    }
    if (text.includes('opinion') || text.includes('essay') || text.includes('future of work') || text.includes('hype') || text.includes('editorial') || text.includes('perspective') || text.includes('analysis') || text.includes('view') || text.includes('creator class') || text.includes('democratization') || text.includes('trust deficit')) {
      return 'Opinion & Analysis';
    }
    
    return defaultCategory || 'Models & Research';
  },

  detectCategory(item, defaultCategory) {
    if (isAIPage) {
      return this.detectAICategory(item, defaultCategory);
    }
    const text = ((item.title || '') + ' ' + (item.description || '') + ' ' + (item.content || '') + ' ' + (item.categories || []).join(' ')).toLowerCase();
    
    if (text.includes('court') || text.includes('parliament') || text.includes('minister') || text.includes('election') || text.includes('modi') || text.includes('government') || text.includes('bill') || text.includes('policy') || text.includes('verdict') || text.includes('chief minister') || text.includes('bjp') || text.includes('congress') || text.includes('political') || text.includes('laws')) {
      return 'Politics';
    }
    if (text.includes('rupee') || text.includes('market') || text.includes('stock') || text.includes('gdp') || text.includes('startup') || text.includes('finance') || text.includes('rbi') || text.includes('economy') || text.includes('acquisition') || text.includes('shares') || text.includes('inflation') || text.includes('corporate') || text.includes('earnings') || text.includes('investor') || text.includes('billion') || text.includes('unicorn') || text.includes('merger') || text.includes('fiscal')) {
      return 'Business';
    }
    if (text.includes('tech') || text.includes('silicon') || text.includes('software') || text.includes('ai') || text.includes('artificial intelligence') || text.includes('chip') || text.includes('smartphone') || text.includes('app') || text.includes('cyber') || text.includes('semiconductor') || text.includes('processor') || text.includes('computing') || text.includes('digital library') || text.includes('phishing')) {
      return 'Tech';
    }
    if (text.includes('space') || text.includes('nasa') || text.includes('isro') || text.includes('scientist') || text.includes('research') || text.includes('solar') || text.includes('climate') || text.includes('vaccine') || text.includes('medical') || text.includes('dna') || text.includes('orbit') || text.includes('environment') || text.includes('forest') || text.includes('weather') || text.includes('monsoon') || text.includes('biodiversity') || text.includes('glaciers') || text.includes('wetland') || text.includes('groundwater')) {
      return 'Science';
    }
    if (text.includes('cricket') || text.includes('match') || text.includes('stadium') || text.includes('player') || text.includes('sports') || text.includes('olympics') || text.includes('fifa') || text.includes('tennis') || text.includes('wicket') || text.includes('cup') || text.includes('bcci') || text.includes('javelin') || text.includes('championship') || text.includes('wrestling') || text.includes('kabaddi') || text.includes('football')) {
      return 'Sports';
    }
    if (text.includes('editorial') || text.includes('opinion') || text.includes('column') || text.includes('analysis') || text.includes('view') || text.includes('perspective') || text.includes('heritage') || text.includes('culture') || text.includes('literary') || text.includes('cinema') || text.includes('social media')) {
      return 'Opinion';
    }
    
    return defaultCategory || 'Politics';
  },

  normalizeArticle(item, sourceName, defaultCategory) {
    const cleanTitle = this.cleanHtml(item.title).trim();
    const category = this.detectCategory(item, defaultCategory);
    const publishedAt = item.pubDate ? new Date(item.pubDate).toISOString() : new Date().toISOString();
    const image = this.extractImage(item, category);
    
    // Extract summary
    let summary = this.cleanHtml(item.description || item.content || '');
    if (summary.length > 200) {
      summary = summary.substring(0, 197) + '...';
    }
    if (!summary) {
      summary = `Read the latest updates from ${sourceName} regarding their recent release.`;
    }

    // Extract full content if present
    let content = this.cleanHtml(item.content || item.description || '');
    // If it's too short, we'll keep it, and the app will generate paragraphs in reader
    
    const uniqueId = `live-${sourceName.replace(/\s+/g, '-').toLowerCase()}-${this.hashCode(item.link || item.guid || cleanTitle)}`;

    return {
      id: uniqueId,
      source: sourceName,
      title: cleanTitle,
      author: this.cleanHtml(item.author) || 'Staff Reporter',
      publishedAt: publishedAt,
      link: item.link,
      category: category,
      summary: summary.trim(),
      content: content.trim(),
      image: image,
      isMock: false
    };
  },

  async fetchSourceFeed(sourceObj) {
    const proxyEndpoint = `https://api.rss2json.com/v1/api.json?rss_url=${encodeURIComponent(sourceObj.url)}`;
    
    // Set 6-second timeout for each fetch
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 6000);

    try {
      const response = await fetch(proxyEndpoint, { signal: controller.signal });
      clearTimeout(timeoutId);

      if (!response.ok) {
        throw new Error(`HTTP Error: ${response.status}`);
      }

      const data = await response.json();
      if (data.status !== 'ok') {
        throw new Error(`Feed converted returned status: ${data.status}`);
      }

      if (!data.items || data.items.length === 0) {
        throw new Error('No items found in feed');
      }

      // Map to standard schema
      return data.items.map(item => this.normalizeArticle(item, sourceObj.name, sourceObj.defaultCategory));
    } catch (error) {
      clearTimeout(timeoutId);
      console.warn(`Failed fetching ${sourceObj.name}:`, error.message);
      throw error;
    }
  },

  /**
   * Fetches feeds from active sources.
   * Handles caching, rate-limiting failures, offline fallbacks, and partial fail recoveries.
   */
  async fetchArticles(selectedSourceIds = null, forceRefresh = false) {
    const enabledSources = NEWS_SOURCES.filter(s => !selectedSourceIds || selectedSourceIds.includes(s.id));
    
    if (enabledSources.length === 0) {
      return { articles: [], status: 'no_sources', sourceStatuses: {} };
    }

    // Attempt cache load first
    if (!forceRefresh) {
      const cachedDataStr = SafeStorage.getItem(CACHE_KEY);
      const cachedTimeStr = SafeStorage.getItem(CACHE_TIME_KEY);
      
      if (cachedDataStr && cachedTimeStr) {
        const cacheAge = Date.now() - parseInt(cachedTimeStr, 10);
        if (cacheAge < CACHE_DURATION_MS) {
          try {
            const cachedArticles = JSON.parse(cachedDataStr);
            // Filter cache by selected sources
            const enabledNames = enabledSources.map(s => s.name);
            const filtered = cachedArticles.filter(art => enabledNames.includes(art.source));
            console.log('Serving from cache. Cached age:', Math.round(cacheAge / 1000), 'seconds');
            return {
              articles: filtered,
              status: 'cached',
              sourceStatuses: enabledSources.reduce((acc, s) => ({ ...acc, [s.id]: 'online' }), {})
            };
          } catch (e) {
            console.error('Failed to parse cache, fetching fresh feeds...', e);
          }
        }
      }
    }

    console.log('Fetching fresh feeds...');
    const sourceStatuses = {};
    const fetchPromises = enabledSources.map(async (src) => {
      try {
        const items = await this.fetchSourceFeed(src);
        sourceStatuses[src.id] = 'online';
        return items;
      } catch (err) {
        sourceStatuses[src.id] = 'offline';
        // Return null so we can filter failed feeds
        return null;
      }
    });

    const results = await Promise.all(fetchPromises);
    let allArticles = [];
    let someFailed = false;
    let allFailed = true;

    results.forEach((items, index) => {
      if (items) {
        allArticles = allArticles.concat(items);
        allFailed = false;
      } else {
        someFailed = true;
      }
    });

    // Sort by publication date desc
    allArticles.sort((a, b) => new Date(b.publishedAt) - new Date(a.publishedAt));

    // If completely offline/rate-limited or all failed, trigger mock database
    if (allFailed) {
      console.warn('All live feeds failed. Serving fully mock fallback.');
      const mockArticles = this.mockGenerator.generateFeed(30);
      
      // Filter mock articles by selected sources
      const enabledNames = enabledSources.map(s => s.name);
      const filteredMock = mockArticles.filter(art => enabledNames.includes(art.source));
      
      return {
        articles: filteredMock,
        status: 'fallback',
        sourceStatuses: enabledSources.reduce((acc, s) => ({ ...acc, [s.id]: 'offline' }), {})
      };
    }

    // If some feeds failed, fill the missing sources with mock articles to maintain balanced coverage
    if (someFailed) {
      console.warn('Some live feeds failed. Appending partial mock articles.');
      const mockArticles = this.mockGenerator.generateFeed(24);
      enabledSources.forEach(src => {
        if (sourceStatuses[src.id] === 'offline') {
          const srcMock = mockArticles.filter(art => art.source === src.name);
          allArticles = allArticles.concat(srcMock);
        }
      });
      // Sort again after partial additions
      allArticles.sort((a, b) => new Date(b.publishedAt) - new Date(a.publishedAt));
    }

    // Save full pool to cache (only cache successfully fetched articles, plus partial mocks if needed)
    try {
      SafeStorage.setItem(CACHE_KEY, JSON.stringify(allArticles));
      SafeStorage.setItem(CACHE_TIME_KEY, Date.now().toString());
    } catch (e) {
      console.error('Failed to write to localStorage cache (possibly quota exceeded):', e);
    }

    return {
      articles: allArticles,
      status: someFailed ? 'partial_fallback' : 'fresh',
      sourceStatuses: sourceStatuses
    };
  }
};
