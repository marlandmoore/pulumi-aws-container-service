import * as pulumi from "@pulumi/pulumi";
import * as aws from "@pulumi/aws";

const ecsExecutionRoleArgs: aws.iam.RoleArgs = {
    // 1. Trust Policy: Allows ECS tasks to assume this role.
    assumeRolePolicy: aws.iam.assumeRolePolicyForPrincipal({
        Service: "ecs-tasks.amazonaws.com",
    }),

    // 2. Managed Policies: The standard policy that grants ECR pull and CloudWatch log permissions.
    managedPolicyArns: [
        "arn:aws:iam::aws:policy/service-role/AmazonECSTaskExecutionRolePolicy",
    ],

    namePrefix: "app-exec-role-",
};

const cluster = new aws.ecs.Cluster("cluster");

const vpcId = "vpc-xxxxxxxxxxxxxxxxx";
const subnetIds = ["subnet-xxxxxxxxxxxxxxxxx", "subnet-yyyyyyyyyyyyyyyyy"];

const lbSecurityGroup = new aws.ec2.SecurityGroup("lb-sg", {
    vpcId: "", // Associate with the created VPC
    description: "Allow HTTP and HTTPS access to the ALB",
    ingress: [
        { protocol: "tcp", fromPort: 80, toPort: 80, cidrBlocks: ["0.0.0.0/0"] },
        { protocol: "tcp", fromPort: 443, toPort: 443, cidrBlocks: ["0.0.0.0/0"] },
    ],
    egress: [
        { protocol: "-1", fromPort: 0, toPort: 0, cidrBlocks: ["0.0.0.0/0"] },
    ],
});


const lbSecurityGroup = new aws.ec2.SecurityGroup("lb-sg", {
    vpcId: vpcId, // Associate with the created VPC
    description: "Allow HTTP and HTTPS access to the ALB",
    ingress: [
        { protocol: "tcp", fromPort: 80, toPort: 80, cidrBlocks: ["0.0.0.0/0"] },
        { protocol: "tcp", fromPort: 443, toPort: 443, cidrBlocks: ["0.0.0.0/0"] },
    ],
    egress: [
        { protocol: "-1", fromPort: 0, toPort: 0, cidrBlocks: ["0.0.0.0/0"] },
    ],
});

const lb = new awsx.lb.ApplicationLoadBalancer("lb", {
    subnetIds: publicSubnetIds,
    securityGroups: [lbSecurityGroup.id], // Use the security group created in the same VPC
});

const service = new awsx.ecs.FargateService("service", {
    cluster: cluster.arn,
    networkConfiguration: {
        // Use the subnets from the VPC associated with the cluster
        subnets: vpc.privateSubnetIds, 
        assignPublicIp: true, 
    },
    taskDefinitionArgs: {
        executionRole: {
            args: ecsExecutionRoleArgs,
        },
        container: {
            name: "app-service",
            image: image.imageUri,
            //image: "499056247873.dkr.ecr.us-west-2.amazonaws.com/demo-app:latest",
            cpu: 1024,
            memory: 2048,
            essential: true,
            portMappings: [
                {
                    containerPort: 8080,
                    targetGroup: lb.defaultTargetGroup,
                },
            ],
        },
    },
});


