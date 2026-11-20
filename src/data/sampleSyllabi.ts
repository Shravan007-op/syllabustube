import { SyllabusDataset, VideoResult, LanguageOption, CountryOption } from '../types/syllabus';

export const THUMBNAILS = {
  trees: '/src/assets/images/thumb_algorithms_trees_1795088515306.jpg',
  memory: '/src/assets/images/thumb_memory_systems_1795088517154.jpg',
  complexity: '/src/assets/images/thumb_sorting_complexity_1795088517132.jpg',
  circuits: '/src/assets/images/thumb_circuits_logic_1795088516432.jpg',
  math: '/src/assets/images/thumb_engineering_math_1795088515897.jpg',
} as const;

export const SUGGESTED_INDIAN_CHANNELS: string[] = [
  'Abdul Bari',
  'Gate Smashers',
  'Neso Academy',
  "Jenny's Lectures CS IT",
  'CodeWithHarry',
  'Striver (take U forward)',
  'Apna College',
  'Engineering Funda',
  "Tikle's Academy",
  'Gajendra Purohit',
];

interface VideoSeed {
  channelName: string;
  countryOrigin: Exclude<CountryOption, 'Global'>;
  isIndianEducator: boolean;
  language: LanguageOption;
  duration: string;
  viewsLabel: string;
  publishedLabel: string;
  relevanceScore: number;
  titleSuffix: string;
}

function buildTopicVideos(
  topicId: string,
  topicTitle: string,
  thumbnailUrl: string,
  customSeeds?: VideoSeed[]
): VideoResult[] {
  const defaultSeeds: VideoSeed[] = [
    {
      channelName: 'Gate Smashers',
      countryOrigin: 'India',
      isIndianEducator: true,
      language: 'Hindi',
      duration: '18:42',
      viewsLabel: '1.4M views',
      publishedLabel: '2 years ago',
      relevanceScore: 98,
      titleSuffix: 'Complete Exam & Concept Explanation',
    },
    {
      channelName: 'Abdul Bari',
      countryOrigin: 'India',
      isIndianEducator: true,
      language: 'English',
      duration: '24:15',
      viewsLabel: '2.1M views',
      publishedLabel: '4 years ago',
      relevanceScore: 97,
      titleSuffix: 'Deep-Dive Lecture with Dry Run',
    },
    {
      channelName: 'Neso Academy',
      countryOrigin: 'India',
      isIndianEducator: true,
      language: 'English',
      duration: '16:08',
      viewsLabel: '890K views',
      publishedLabel: '3 years ago',
      relevanceScore: 95,
      titleSuffix: 'Step-by-Step University Lecture',
    },
    {
      channelName: "Jenny's Lectures CS IT",
      countryOrigin: 'India',
      isIndianEducator: true,
      language: 'English',
      duration: '22:30',
      viewsLabel: '1.1M views',
      publishedLabel: '3 years ago',
      relevanceScore: 94,
      titleSuffix: 'Solved Examples & Intuition',
    },
    {
      channelName: 'CodeWithHarry',
      countryOrigin: 'India',
      isIndianEducator: true,
      language: 'Hindi',
      duration: '27:54',
      viewsLabel: '960K views',
      publishedLabel: '1 year ago',
      relevanceScore: 92,
      titleSuffix: 'Practical Implementation in Hindi',
    },
    {
      channelName: 'Engineering Marathi',
      countryOrigin: 'India',
      isIndianEducator: true,
      language: 'Marathi',
      duration: '19:12',
      viewsLabel: '145K views',
      publishedLabel: '1 year ago',
      relevanceScore: 90,
      titleSuffix: 'SPPU & Mumbai University Revision (Marathi)',
    },
    {
      channelName: 'Striver (take U forward)',
      countryOrigin: 'India',
      isIndianEducator: true,
      language: 'English',
      duration: '31:05',
      viewsLabel: '780K views',
      publishedLabel: '2 years ago',
      relevanceScore: 91,
      titleSuffix: 'Optimal Approach & Complexity Analysis',
    },
    {
      channelName: 'RG Lectures',
      countryOrigin: 'India',
      isIndianEducator: true,
      language: 'Marathi',
      duration: '15:40',
      viewsLabel: '98K views',
      publishedLabel: '10 months ago',
      relevanceScore: 88,
      titleSuffix: 'Easy Exam Breakdown in Marathi',
    },
    {
      channelName: 'MIT OpenCourseWare',
      countryOrigin: 'United States',
      isIndianEducator: false,
      language: 'English',
      duration: '48:19',
      viewsLabel: '1.8M views',
      publishedLabel: '5 years ago',
      relevanceScore: 87,
      titleSuffix: 'MIT Full Theoretical Lecture',
    },
    {
      channelName: 'freeCodeCamp.org',
      countryOrigin: 'United States',
      isIndianEducator: false,
      language: 'English',
      duration: '34:26',
      viewsLabel: '1.3M views',
      publishedLabel: '2 years ago',
      relevanceScore: 85,
      titleSuffix: 'Visual Walkthrough & Code',
    },
    {
      channelName: 'Computerphile',
      countryOrigin: 'United Kingdom',
      isIndianEducator: false,
      language: 'English',
      duration: '14:52',
      viewsLabel: '640K views',
      publishedLabel: '3 years ago',
      relevanceScore: 83,
      titleSuffix: 'Core Principles Explained',
    },
    {
      channelName: 'Coursa Español Edu',
      countryOrigin: 'United States',
      isIndianEducator: false,
      language: 'Other',
      duration: '20:11',
      viewsLabel: '112K views',
      publishedLabel: '1 year ago',
      relevanceScore: 76,
      titleSuffix: 'Multilingual Conceptual Summary',
    },
  ];

  const seeds = customSeeds ?? defaultSeeds;

  return seeds.map((seed, idx) => {
    const title = `${topicTitle} — ${seed.titleSuffix}`;
    return {
      id: `${topicId}-v${idx + 1}`,
      title,
      channelName: seed.channelName,
      countryOrigin: seed.countryOrigin,
      isIndianEducator: seed.isIndianEducator,
      language: seed.language,
      duration: seed.duration,
      viewsLabel: seed.viewsLabel,
      publishedLabel: seed.publishedLabel,
      thumbnailUrl,
      summary: `Structured demonstration lecture covering ${topicTitle} tailored for university semester exams and conceptual clarity.`,
      youtubeSearchQuery: `${topicTitle} ${seed.channelName}`,
      relevanceScore: seed.relevanceScore,
    };
  });
}

export const SAMPLE_SYLLABI: Record<'dsa' | 'os' | 'math', SyllabusDataset> = {
  dsa: {
    id: 'cs301-dsa',
    subjectCode: 'CS301',
    subjectTitle: 'Data Structures & Algorithms',
    department: 'B.Tech / B.E. Computer Science & Engineering',
    semesterLabel: 'Semester III · University Pattern',
    sourceLabel: 'Sample Dataset · CS301_DSA_Syllabus.pdf',
    units: [
      {
        id: 'dsa-u1',
        unitNumber: 1,
        title: 'Algorithm Analysis & Linear Structures',
        overview:
          'Asymptotic bounds, time-space tradeoffs, array memory layout, and dynamic singly/doubly linked lists.',
        topics: [
          {
            id: 'dsa-u1-t1',
            topicCode: '1.1',
            title: 'Asymptotic Notations & Recurrence Relations',
            description:
              'Big-O, Omega, Theta notations, Master Theorem, and recursion tree complexity analysis.',
            keywords: ['Big-O', 'Master Theorem', 'Time Complexity', 'Recurrence'],
            videos: buildTopicVideos(
              'dsa-u1-t1',
              'Asymptotic Notations & Master Theorem',
              THUMBNAILS.complexity
            ),
          },
          {
            id: 'dsa-u1-t2',
            topicCode: '1.2',
            title: 'Singly, Doubly & Circular Linked Lists',
            description:
              'Pointer manipulation, insertion/deletion edge cases, cycle detection, and polynomial representation.',
            keywords: ['Linked List', 'Pointers', 'Cycle Detection', 'Dynamic Memory'],
            videos: buildTopicVideos(
              'dsa-u1-t2',
              'Linked Lists & Pointer Operations',
              THUMBNAILS.memory
            ),
          },
        ],
      },
      {
        id: 'dsa-u2',
        unitNumber: 2,
        title: 'Stacks, Queues & Expression Evaluation',
        overview:
          'LIFO/FIFO abstract data types, infix-to-postfix conversion, circular queues, and priority queues.',
        topics: [
          {
            id: 'dsa-u2-t1',
            topicCode: '2.1',
            title: 'Stacks, Infix to Postfix & Recursion Stack',
            description:
              'Array and linked implementations of stacks, operator precedence parsing, and function call frames.',
            keywords: ['Stack', 'Infix to Postfix', 'Call Stack', 'LIFO'],
            videos: buildTopicVideos(
              'dsa-u2-t1',
              'Stacks & Infix to Postfix Conversion',
              THUMBNAILS.memory
            ),
          },
          {
            id: 'dsa-u2-t2',
            topicCode: '2.2',
            title: 'Circular Queues, Deques & Priority Queues',
            description:
              'Modulo arithmetic indexing for circular buffers, double-ended queues, and CPU scheduling queues.',
            keywords: ['Circular Queue', 'Deque', 'Priority Queue', 'FIFO'],
            videos: buildTopicVideos(
              'dsa-u2-t2',
              'Circular Queues & Priority Queues',
              THUMBNAILS.memory
            ),
          },
        ],
      },
      {
        id: 'dsa-u3',
        unitNumber: 3,
        title: 'Trees, AVL Balancing & Graph Algorithms',
        overview:
          'Binary search trees, self-balancing rotations, BFS/DFS traversals, and shortest path algorithms.',
        topics: [
          {
            id: 'dsa-u3-t1',
            topicCode: '3.1',
            title: 'Binary Search Trees & AVL Tree Rotations',
            description:
              'Inorder/preorder/postorder traversals, BST deletion cases, balance factors, and LL/RR/LR/RL rotations.',
            keywords: ['BST', 'AVL Tree', 'Rotations', 'Tree Traversal'],
            videos: buildTopicVideos(
              'dsa-u3-t1',
              'Binary Search Trees & AVL Rotations',
              THUMBNAILS.trees
            ),
          },
          {
            id: 'dsa-u3-t2',
            topicCode: '3.2',
            title: 'Graph Traversals (BFS, DFS) & Dijkstra Shortest Path',
            description:
              'Adjacency list vs matrix, topological sorting, minimum spanning trees, and Dijkstra greedy relaxation.',
            keywords: ['BFS', 'DFS', 'Dijkstra', 'Spanning Tree'],
            videos: buildTopicVideos(
              'dsa-u3-t2',
              'Graph BFS, DFS & Dijkstra Algorithm',
              THUMBNAILS.trees
            ),
          },
        ],
      },
      {
        id: 'dsa-u4',
        unitNumber: 4,
        title: 'Sorting, Searching & Hashing Techniques',
        overview:
          'Divide-and-conquer sorting algorithms, heap sort, and collision resolution in hash tables.',
        topics: [
          {
            id: 'dsa-u4-t1',
            topicCode: '4.1',
            title: 'Merge Sort, Quick Sort & Heap Sort',
            description:
              'Partitioning strategies, worst-case pivots, heapify operations, and stability comparison.',
            keywords: ['Quick Sort', 'Merge Sort', 'Heap Sort', 'Divide and Conquer'],
            videos: buildTopicVideos(
              'dsa-u4-t1',
              'Quick Sort, Merge Sort & Heap Sort',
              THUMBNAILS.complexity
            ),
          },
          {
            id: 'dsa-u4-t2',
            topicCode: '4.2',
            title: 'Hash Tables & Collision Resolution',
            description:
              'Separate chaining, linear/quadratic probing, double hashing, and load factor rehashing.',
            keywords: ['Hashing', 'Linear Probing', 'Chaining', 'Load Factor'],
            videos: buildTopicVideos(
              'dsa-u4-t2',
              'Hashing & Collision Resolution Techniques',
              THUMBNAILS.memory
            ),
          },
        ],
      },
    ],
  },
  os: {
    id: 'cs402-os',
    subjectCode: 'CS402',
    subjectTitle: 'Operating Systems & System Architecture',
    department: 'B.Tech / B.E. Computer Engineering',
    semesterLabel: 'Semester IV · University Pattern',
    sourceLabel: 'Sample Dataset · CS402_Operating_Systems.pdf',
    units: [
      {
        id: 'os-u1',
        unitNumber: 1,
        title: 'Process Management & CPU Scheduling',
        overview:
          'Process states, PCB architecture, context switching, FCFS, SJF, Round Robin, and multilevel queues.',
        topics: [
          {
            id: 'os-u1-t1',
            topicCode: '1.1',
            title: 'Process Control Block & CPU Scheduling Algorithms',
            description:
              'Gantt chart numericals for FCFS, SRTF, Priority, and Round Robin with turnaround and waiting times.',
            keywords: ['PCB', 'Round Robin', 'SJF', 'CPU Scheduling'],
            videos: buildTopicVideos(
              'os-u1-t1',
              'CPU Scheduling Algorithms & Gantt Charts',
              THUMBNAILS.circuits
            ),
          },
          {
            id: 'os-u1-t2',
            topicCode: '1.2',
            title: 'Process Synchronisation, Semaphores & Deadlocks',
            description:
              'Critical section problem, Producer-Consumer semaphores, and Banker’s Deadlock Avoidance algorithm.',
            keywords: ['Semaphore', 'Deadlock', 'Bankers Algorithm', 'Mutex'],
            videos: buildTopicVideos(
              'os-u1-t2',
              "Semaphores & Banker's Deadlock Algorithm",
              THUMBNAILS.circuits
            ),
          },
        ],
      },
      {
        id: 'os-u2',
        unitNumber: 2,
        title: 'Memory Management & Virtual Paging',
        overview:
          'Contiguous allocation, paging hardware, TLB hit ratios, page replacement policies, and thrashing.',
        topics: [
          {
            id: 'os-u2-t1',
            topicCode: '2.1',
            title: 'Paging, Segmentation & Page Replacement (LRU, FIFO, Optimal)',
            description:
              'Logical-to-physical address translation, page fault calculations, and Belady’s anomaly.',
            keywords: ['Paging', 'TLB', 'LRU', 'Virtual Memory'],
            videos: buildTopicVideos(
              'os-u2-t1',
              'Paging & Page Replacement Algorithms',
              THUMBNAILS.memory
            ),
          },
        ],
      },
    ],
  },
  math: {
    id: 'ma301-math',
    subjectCode: 'MA301',
    subjectTitle: 'Engineering Mathematics III',
    department: 'Common Engineering Curriculum',
    semesterLabel: 'Semester III · University Pattern',
    sourceLabel: 'Sample Dataset · MA301_Engg_Math_III.pdf',
    units: [
      {
        id: 'math-u1',
        unitNumber: 1,
        title: 'Laplace & Inverse Laplace Transforms',
        overview:
          'Standard transforms, shifting theorems, convolution theorem, and solving linear differential equations.',
        topics: [
          {
            id: 'math-u1-t1',
            topicCode: '1.1',
            title: 'Laplace Transform Properties & Convolution Theorem',
            description:
              'First & second shifting theorems, Laplace of derivatives, and initial value ODE applications.',
            keywords: ['Laplace Transform', 'Convolution', 'ODE', 'Shifting Theorem'],
            videos: buildTopicVideos(
              'math-u1-t1',
              'Laplace Transforms & Convolution Theorem',
              THUMBNAILS.math,
              [
                {
                  channelName: 'Dr. Gajendra Purohit',
                  countryOrigin: 'India',
                  isIndianEducator: true,
                  language: 'Hindi',
                  duration: '26:18',
                  viewsLabel: '2.4M views',
                  publishedLabel: '3 years ago',
                  relevanceScore: 99,
                  titleSuffix: 'Full Concept & University Numericals',
                },
                {
                  channelName: "Tikle's Academy",
                  countryOrigin: 'India',
                  isIndianEducator: true,
                  language: 'English',
                  duration: '21:45',
                  viewsLabel: '980K views',
                  publishedLabel: '2 years ago',
                  relevanceScore: 97,
                  titleSuffix: 'Solved University Exam Problems',
                },
                {
                  channelName: 'Bhagwan Singh Vishwakarma',
                  countryOrigin: 'India',
                  isIndianEducator: true,
                  language: 'Hindi',
                  duration: '24:10',
                  viewsLabel: '1.1M views',
                  publishedLabel: '3 years ago',
                  relevanceScore: 95,
                  titleSuffix: 'Step-by-Step Formula Derivation',
                },
                {
                  channelName: 'Ekeeda',
                  countryOrigin: 'India',
                  isIndianEducator: true,
                  language: 'English',
                  duration: '19:33',
                  viewsLabel: '420K views',
                  publishedLabel: '2 years ago',
                  relevanceScore: 92,
                  titleSuffix: 'Engineering Mathematics III Lecture',
                },
                {
                  channelName: 'Dinesh Sir Engineering',
                  countryOrigin: 'India',
                  isIndianEducator: true,
                  language: 'Marathi',
                  duration: '22:05',
                  viewsLabel: '310K views',
                  publishedLabel: '1 year ago',
                  relevanceScore: 91,
                  titleSuffix: 'Maharashtra University Revision (Marathi)',
                },
                {
                  channelName: 'NPTEL-NOC IITM',
                  countryOrigin: 'India',
                  isIndianEducator: true,
                  language: 'English',
                  duration: '44:12',
                  viewsLabel: '540K views',
                  publishedLabel: '4 years ago',
                  relevanceScore: 90,
                  titleSuffix: 'IIT Madras Formal Lecture',
                },
                {
                  channelName: 'Last Moment Tuitions',
                  countryOrigin: 'India',
                  isIndianEducator: true,
                  language: 'Hindi',
                  duration: '17:50',
                  viewsLabel: '690K views',
                  publishedLabel: '2 years ago',
                  relevanceScore: 89,
                  titleSuffix: 'Quick Exam Revision Series',
                },
                {
                  channelName: 'RG Lectures',
                  countryOrigin: 'India',
                  isIndianEducator: true,
                  language: 'Marathi',
                  duration: '18:22',
                  viewsLabel: '115K views',
                  publishedLabel: '10 months ago',
                  relevanceScore: 87,
                  titleSuffix: 'Important Questions in Marathi',
                },
                {
                  channelName: '3Blue1Brown',
                  countryOrigin: 'United States',
                  isIndianEducator: false,
                  language: 'English',
                  duration: '21:14',
                  viewsLabel: '3.2M views',
                  publishedLabel: '2 years ago',
                  relevanceScore: 88,
                  titleSuffix: 'Visual Intuition Behind Transforms',
                },
                {
                  channelName: 'MIT OpenCourseWare',
                  countryOrigin: 'United States',
                  isIndianEducator: false,
                  language: 'English',
                  duration: '49:08',
                  viewsLabel: '1.5M views',
                  publishedLabel: '6 years ago',
                  relevanceScore: 84,
                  titleSuffix: 'Differential Equations Lecture',
                },
              ]
            ),
          },
        ],
      },
      {
        id: 'math-u2',
        unitNumber: 2,
        title: 'Vector Calculus & Integral Theorems',
        overview:
          'Directional derivatives, gradient, divergence, curl, Green’s, Stokes’ and Gauss Divergence theorems.',
        topics: [
          {
            id: 'math-u2-t1',
            topicCode: '2.1',
            title: 'Gradient, Divergence, Curl & Gauss Divergence Theorem',
            description:
              'Vector differential operators, irrotational and solenoidal fields, and surface-to-volume integrals.',
            keywords: ['Divergence', 'Curl', 'Stokes Theorem', 'Vector Calculus'],
            videos: buildTopicVideos(
              'math-u2-t1',
              'Gradient, Divergence & Curl',
              THUMBNAILS.math
            ),
          },
        ],
      },
    ],
  },
};

export const SAMPLE_SYLLABUS_TEXTS: Record<'dsa' | 'os' | 'math', string> = {
  dsa: `CS301: Data Structures & Algorithms
Unit 1: Algorithm Analysis & Linear Structures
- Asymptotic Notations (Big-O, Omega, Theta) & Recurrence Relations
- Singly, Doubly & Circular Linked Lists

Unit 2: Stacks, Queues & Expression Evaluation
- Stacks, Infix to Postfix Conversion & Recursion Stack
- Circular Queues, Deques & Priority Queues

Unit 3: Trees, AVL Balancing & Graph Algorithms
- Binary Search Trees & AVL Tree Rotations
- Graph Traversals (BFS, DFS) & Dijkstra Shortest Path

Unit 4: Sorting, Searching & Hashing Techniques
- Merge Sort, Quick Sort & Heap Sort
- Hash Tables & Collision Resolution`,

  os: `CS402: Operating Systems & System Architecture
Unit 1: Process Management & CPU Scheduling
- Process Control Block & CPU Scheduling Algorithms (FCFS, SJF, Round Robin)
- Process Synchronisation, Semaphores & Deadlocks (Banker's Algorithm)

Unit 2: Memory Management & Virtual Paging
- Paging, Segmentation & Page Replacement (LRU, FIFO, Optimal)`,

  math: `MA301: Engineering Mathematics III
Unit 1: Laplace & Inverse Laplace Transforms
- Laplace Transform Properties & Convolution Theorem

Unit 2: Vector Calculus & Integral Theorems
- Gradient, Divergence, Curl & Gauss Divergence Theorem`,
};

/**
 * Generates a realistic custom SyllabusDataset when a user types custom syllabus text
 * or uploads a PDF/JPG/PNG file, matching the extracted unit/topic lines against
 * our demonstration video pool.
 */
export function buildCustomSyllabusDataset(
  rawText: string,
  fileName?: string
): SyllabusDataset {
  const cleaned = rawText.trim();
  const lower = cleaned.toLowerCase();

  // If user pasted text closely matching a preset or uploaded a named file
  if (!cleaned && fileName) {
    const fnLower = fileName.toLowerCase();
    if (fnLower.includes('os') || fnLower.includes('operating')) {
      return {
        ...SAMPLE_SYLLABI.os,
        sourceLabel: `Uploaded File (Demo Parse) · ${fileName}`,
      };
    }
    if (fnLower.includes('math') || fnLower.includes('ma301') || fnLower.includes('calc')) {
      return {
        ...SAMPLE_SYLLABI.math,
        sourceLabel: `Uploaded File (Demo Parse) · ${fileName}`,
      };
    }
    return {
      ...SAMPLE_SYLLABI.dsa,
      sourceLabel: `Uploaded File (Demo Parse) · ${fileName}`,
    };
  }

  // Parse custom text lines into units & topics if structured
  const lines = cleaned
    .split(/\r?\n/)
    .map((l) => l.trim())
    .filter(Boolean);

  if (lines.length === 0) {
    return SAMPLE_SYLLABI.dsa;
  }

  let subjectTitle = 'Custom University Syllabus';
  let subjectCode = 'SYL101';
  let startIdx = 0;

  const romanMap: Record<string, number> = {
    i: 1,
    ii: 2,
    iii: 3,
    iv: 4,
    v: 5,
    vi: 6,
    vii: 7,
    viii: 8,
    ix: 9,
    x: 10,
  };

  if (!/^(?:unit|module|chapter)[\s-]*(\d+|i{1,3}|iv|vi{0,3}|ix|x)\b/i.test(lines[0])) {
    const firstLine = lines[0];
    const codeMatch = firstLine.match(/^([A-Z]{2,5}\s?-?\d{2,4})[:\s-]+(.+)$/i);
    if (codeMatch) {
      subjectCode = codeMatch[1].toUpperCase();
      subjectTitle = codeMatch[2].trim();
    } else {
      subjectTitle = firstLine.slice(0, 80);
    }
    startIdx = 1;
  }

  const pickThumb = (text: string) => {
    const t = text.toLowerCase();
    if (t.includes('tree') || t.includes('graph') || t.includes('bfs') || t.includes('dfs')) {
      return THUMBNAILS.trees;
    }
    if (t.includes('sort') || t.includes('complexity') || t.includes('big-o') || t.includes('search')) {
      return THUMBNAILS.complexity;
    }
    if (t.includes('circuit') || t.includes('cpu') || t.includes('process') || t.includes('gate') || t.includes('os')) {
      return THUMBNAILS.circuits;
    }
    if (t.includes('math') || t.includes('laplace') || t.includes('matrix') || t.includes('vector') || t.includes('calculus')) {
      return THUMBNAILS.math;
    }
    return THUMBNAILS.memory;
  };

  const units: SyllabusDataset['units'] = [];
  let currentUnit: SyllabusDataset['units'][number] | null = null;

  for (let i = startIdx; i < lines.length; i++) {
    const line = lines[i];
    const unitMatch = line.match(
      /^(?:unit|module|chapter)[\s-]*(\d+|i{1,3}|iv|vi{0,3}|ix|x)[:.\s-]*(.*)$/i
    );
    if (unitMatch) {
      const token = unitMatch[1].toLowerCase();
      const num = /^\d+$/.test(token)
        ? parseInt(token, 10)
        : (romanMap[token] ?? units.length + 1);
      currentUnit = {
        id: `custom-u${num}-${i}`,
        unitNumber: num,
        title: unitMatch[2]?.trim() || `Unit ${num}`,
        overview: 'Extracted from your syllabus with topic-matched video results.',
        topics: [],
      };
      units.push(currentUnit);
      continue;
    }

    const topicText = line.replace(/^[-*•\d.)]+\s*/, '').trim();
    if (!topicText) continue;

    if (!currentUnit) {
      currentUnit = {
        id: 'custom-u1',
        unitNumber: 1,
        title: 'Core Syllabus Topics',
        overview: 'Extracted from your syllabus with topic-matched video results.',
        topics: [],
      };
      units.push(currentUnit);
    }

    const topicNum = currentUnit.topics.length + 1;
    const topicId = `custom-u${currentUnit.unitNumber}-t${topicNum}`;
    const words = topicText
      .split(/[\s,;&/()]+/)
      .filter((w) => w.length > 3)
      .slice(0, 4);

    currentUnit.topics.push({
      id: topicId,
      topicCode: `${currentUnit.unitNumber}.${topicNum}`,
      title: topicText,
      description: `Video lectures matching "${topicText}".`,
      keywords: words.length > 0 ? words : [subjectCode, 'University Lecture'],
      videos: buildTopicVideos(topicId, topicText, pickThumb(topicText + ' ' + lower)),
    });
  }

  const validUnits = units.filter((u) => u.topics.length > 0);
  if (validUnits.length === 0) {
    const fallbackTopic = lines[0].slice(0, 80);
    return {
      id: `custom-syllabus-${Date.now()}`,
      subjectCode,
      subjectTitle,
      department: 'Extracted Syllabus',
      semesterLabel: 'Topic Analysis',
      sourceLabel: fileName
        ? `Uploaded Document · ${fileName}`
        : 'Manual Syllabus Entry',
      units: [
        {
          id: 'custom-u1',
          unitNumber: 1,
          title: 'Core Concepts',
          overview: 'Extracted from your syllabus input.',
          topics: [
            {
              id: 'custom-u1-t1',
              topicCode: '1.1',
              title: fallbackTopic,
              description: `Video lectures matching "${fallbackTopic}".`,
              keywords: [fallbackTopic],
              videos: buildTopicVideos('custom-u1-t1', fallbackTopic, pickThumb(fallbackTopic)),
            },
          ],
        },
      ],
    };
  }

  return {
    id: `custom-syllabus-${Date.now()}`,
    subjectCode,
    subjectTitle,
    department: 'University Syllabus Roadmap',
    semesterLabel: 'Topic Analysis',
    sourceLabel: fileName
      ? `Uploaded Document · ${fileName}`
      : 'Manual Syllabus Entry',
    units: validUnits,
  };
}
