type EnvironmentId = string;
type ServiceId = string;
type GroupId = string;

type LogicalGroup = {
    id: GroupId;
    name: string;
    description?: string;
    nodeAttrs?: string;
};

type Environment = {
    id: EnvironmentId;
    name: string;
    description?: string;
    nodeAttrs?: string;
};

type Service = {
    id: ServiceId;
    name: string;
    description?: string;
    url?: string;
    logicalGroup: GroupId;
    deployedIn: EnvironmentId;
    dependencies: ServiceId[];
};

type Architecture = {
    logicalGroups: LogicalGroup[];
    environments: Environment[];
    services: Service[];
};

const render = (node: DotNode) => {
    const {lines, children} = node;
    const content: string = `${lines?.join('\n') ?? ''}${children ? '\n' : ''}${children?.map(render).join('\n') ?? ''}`;
    return `${node.name} {\n${content
        .split('\n')
        .map((l) => `  ${l}`)
        .join('\n')}\n}`;
};

type DotNode = {
    name: string;
    lines?: string[];
    children?: DotNode[];
};

function generateDot(archs: Architecture) {
    const {logicalGroups, environments, services} = archs;
    const envsById = new Map(environments.map((e) => [e.id, e]));
    const getEnvShape = (envId: EnvironmentId) => {
        const nodeAttrs = envsById.get(envId)?.nodeAttrs;
        if (nodeAttrs) {
            return nodeAttrs;
        }
        return '';
    };
    const prop = (key: string, val: string | undefined) => (val ? `${key}="${val}"` : '');
    const props = (props: Record<string, string | undefined>, extra?: string) =>
        `[${Object.entries(props)
            .map(([k, v]) => prop(k, v))
            .join(' ')} ${extra ?? ''}]`;
    return render({
        name: 'digraph',
        lines: [
            'rankdir=LR',
            'node [shape=record style=filled]',
            ...services.flatMap((s) => s.dependencies.map((d) => `${s.id} -> ${d}`)),
        ],
        children: [
            {
                name: 'subgraph cluster_01',
                lines: [
                    'label="Legend"',
                    'style=filled',
                    'color=lightgrey',
                    ...environments.map(
                        (e) => `${e.id} [label="${e.name}" tooltip="${e.description}" ${getEnvShape(e.id)}];`
                    ),
                ],
            },
            ...logicalGroups.map((lg, i) => ({
                name: `subgraph cluster_${i}`,
                lines: [
                    `label="${lg.name}"`,
                    ...services
                        .filter((s) => s.logicalGroup === lg.id)
                        .map(
                            (s) =>
                                `"${s.id}" ${props(
                                    {
                                        label: s.name,
                                        tooltip: s.description,
                                        URL: s.url,
                                    },
                                    getEnvShape(s.deployedIn)
                                )};`
                        ),
                ],
            })),
        ],
    });
}

function readConfig(argv: string[]) {
    if (argv[2] != null) {
        return argv[2];
    }
    throw new Error('auto config resolution not supported')
}

function parseConfig(cfgFile: string) {
    return require(cfgFile).default;
}

function run() {
    const cfgFile = readConfig(process.argv);
    const cfg = parseConfig(cfgFile);
    return generateDot(cfg);
}

console.log(run());
