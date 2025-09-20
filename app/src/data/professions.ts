export type ProfessionCategory =
  | 'core-engineering'
  | 'specialized-engineering'
  | 'product-design'
  | 'emerging';

export interface ProfessionOption {
  id: string;
  title: string;
  description: string;
  category: ProfessionCategory;
  tools: string[];
}

export const PROFESSION_OPTIONS: ProfessionOption[] = [
  {
    id: 'frontend-developer',
    title: 'Frontend Developer',
    description: 'Focus on rich web interfaces, design systems, and modern JavaScript frameworks.',
    category: 'core-engineering',
    tools: ['Next.js', 'Vue.js', 'Angular', 'Svelte', 'JavaScript', 'TypeScript']
  },
  {
    id: 'backend-developer',
    title: 'Backend Developer',
    description: 'Work on APIs, services, performance, and data access layers powering applications.',
    category: 'core-engineering',
    tools: ['Node.js', 'Python', 'Java', 'C#', 'Go', 'Express', 'FastAPI', 'Spring Boot']
  },
  {
    id: 'fullstack-developer',
    title: 'Full Stack Developer',
    description: 'Ship end-to-end features spanning UI, APIs, deployment, and developer experience.',
    category: 'core-engineering',
    tools: ['Next.js', 'Vue.js', 'TypeScript', 'Node.js', 'Python', 'Express']
  },
  {
    id: 'mobile-developer',
    title: 'Mobile Developer',
    description: 'Craft native and cross-platform experiences with focus on performance and UX.',
    category: 'core-engineering',
    tools: ['React Native', 'Flutter', 'Xamarin', 'Swift', 'Kotlin', 'Java']
  },
  {
    id: 'devops-engineer',
    title: 'DevOps Engineer',
    description: 'Automate delivery pipelines, infrastructure, and reliability tooling across environments.',
    category: 'core-engineering',
    tools: ['AWS', 'Azure', 'Google Cloud', 'Docker', 'Kubernetes', 'Helm']
  },
  {
    id: 'qa-engineer',
    title: 'QA Engineer',
    description: 'Guard quality with automation, exploratory testing, and release validation strategies.',
    category: 'core-engineering',
    tools: ['Selenium', 'Cypress', 'Jest', 'Mocha', 'JavaScript', 'Python', 'Java']
  },
  {
    id: 'data-scientist',
    title: 'Data Scientist',
    description: 'Transform data into insights through experimentation, ML models, and storytelling.',
    category: 'specialized-engineering',
    tools: ['Python', 'R', 'SQL', 'TensorFlow', 'PyTorch', 'Scikit-learn']
  },
  {
    id: 'data-engineer',
    title: 'Data Engineer',
    description: 'Build resilient data platforms, pipelines, and storage for analytics and ML workloads.',
    category: 'specialized-engineering',
    tools: ['Python', 'SQL', 'Apache Spark', 'Hadoop', 'Kafka', 'Airflow']
  },
  {
    id: 'ml-engineer',
    title: 'ML Engineer',
    description: 'Operationalize machine learning systems with reproducibility, monitoring, and scale.',
    category: 'specialized-engineering',
    tools: ['Python', 'TensorFlow', 'PyTorch', 'Scikit-learn', 'MLflow', 'Kubeflow']
  },
  {
    id: 'security-engineer',
    title: 'Security Engineer',
    description: 'Protect products and infrastructure with proactive security reviews and tooling.',
    category: 'specialized-engineering',
    tools: ['Python', 'Bash', 'PowerShell', 'OWASP', 'Nmap', 'Metasploit']
  },
  {
    id: 'cloud-engineer',
    title: 'Cloud Engineer',
    description: 'Design cloud-native architectures, IaC workflows, and scalable platform foundations.',
    category: 'specialized-engineering',
    tools: ['AWS', 'Azure', 'Google Cloud', 'Terraform', 'Ansible', 'Docker']
  },
  {
    id: 'system-administrator',
    title: 'System Administrator',
    description: 'Run core infrastructure: servers, networks, monitoring, and secure configurations.',
    category: 'specialized-engineering',
    tools: ['Linux', 'Windows Server', 'Networking', 'DNS', 'DHCP']
  },
  {
    id: 'ui-ux-designer',
    title: 'UI/UX Designer',
    description: 'Shape user journeys, visual language, and prototypes across accessibility breakpoints.',
    category: 'product-design',
    tools: ['Figma', 'Sketch', 'Adobe XD', 'InVision', 'Framer', 'Principle']
  },
  {
    id: 'product-manager',
    title: 'Product Manager',
    description: 'Prioritize roadmaps, analyze metrics, and align teams around impactful outcomes.',
    category: 'product-design',
    tools: ['Google Analytics', 'Mixpanel', 'Amplitude', 'Jira', 'Confluence']
  },
  {
    id: 'blockchain-developer',
    title: 'Blockchain Developer',
    description: 'Ship decentralized apps, smart contracts, and core protocol integrations.',
    category: 'emerging',
    tools: ['Solidity', 'Web3.js', 'Ethereum', 'Smart Contracts']
  },
  {
    id: 'game-developer',
    title: 'Game Developer',
    description: 'Deliver immersive experiences using gameplay engines and performance tooling.',
    category: 'emerging',
    tools: ['Unity', 'Unreal Engine', 'C#', 'C++', 'JavaScript']
  },
  {
    id: 'embedded-developer',
    title: 'Embedded Developer',
    description: 'Engineer firmware, drivers, and IoT solutions on constrained hardware.',
    category: 'emerging',
    tools: ['C', 'C++', 'Assembly', 'Microcontrollers', 'IoT']
  },
  {
    id: 'other',
    title: 'Other / Hybrid Role',
    description: 'Нишевые роли: техлид, аналитик данных, SRE, преподаватель, консультант и т.п.',
    category: 'emerging',
    tools: []
  }
];

const seedToolGroups: string[][] = [
  ['React', 'TypeScript'],
  ['React', 'System Design'],
  ['React', 'Testing'],
  ['Frontend Architecture', 'System Design']
];

const seedToolFrequency = seedToolGroups.reduce<Map<string, number>>((acc, group) => {
  group.forEach((tool) => {
    const normalized = tool.trim();
    if (!normalized) return;
    acc.set(normalized, (acc.get(normalized) ?? 0) + 1);
  });
  return acc;
}, new Map());

export const RECENTLY_POPULAR_TOOLS = Array.from(seedToolFrequency.entries())
  .sort((a, b) => {
    if (b[1] !== a[1]) {
      return b[1] - a[1];
    }
    return a[0].localeCompare(b[0]);
  })
  .map(([tool]) => tool);

export const ALL_PROFESSION_TOOLS = Array.from(
  new Map(
    PROFESSION_OPTIONS.flatMap((option) => option.tools)
      .map((tool) => [tool.toLowerCase(), tool] as const)
  ).values()
).sort((a, b) => a.localeCompare(b));
