import * as pulumi from "@pulumi/pulumi";
import * as aws from "@pulumi/aws";
import * as awsx from "@pulumi/awsx";
import * as component from "./component"

const config = new pulumi.Config();
const containerPort = config.getNumber("containerPort") || 8080;
const cpuValue = config.getNumber("cpu") || 512; 
const memoryValue = config.getNumber("memory") || 1024; 
const currentRegion = aws.config.region;

// VPC and Subnet IDs are required to be set in the Pulumi config file
const vpcId = config.require("vpcId");
const subnetIds = config.requireObject<string[]>("subnets"); 
const securityGroupId = config.require("security-groupId"); 

// --- 1. ECR Repository and Image Build ---

// Set up ECR Repository
const repo = new awsx.ecr.Repository("repo", {
    forceDelete: true,
    name: "fargate-app-repo",
});

// Push image to ECR (Assumes a Dockerfile exists in the './app' directory)
const image = new awsx.ecr.Image("image", {
    repositoryUrl: repo.repository.repositoryUrl,
    context: "./app",
    platform: "linux/amd64",
});


// Create ECS Cluster
const cluster = new aws.ecs.Cluster("cluster");

const taskAssumeRolePolicy = aws.iam.getPolicyDocument({
    statements: [{
        actions: ["sts:AssumeRole"],
        principals: [{
            type: "Service",
            identifiers: ["ecs-tasks.amazonaws.com"],
        }],
        effect: "Allow",
    }],
});

const taskExecutionRole = new aws.iam.Role("ecsTaskRole", {
    assumeRolePolicy: taskAssumeRolePolicy.then(policy => policy.json),
    name: "MyEcsTaskRole", 
});

const executionRole = new aws.iam.Role("executionRole" , {
     assumeRolePolicy: aws.iam.assumeRolePolicyForPrincipal({
        Service: "ecs-tasks.amazonaws.com",
    }),
});

new aws.iam.RolePolicyAttachment("taskExecPolicy", {
    role: executionRole.name,
    policyArn: aws.iam.ManagedPolicy.AmazonECSTaskExecutionRolePolicy,
});

const containerDefinitionsJson = image.imageUri.apply(imageUri => JSON.stringify([
    {
        name: "app",
        image: imageUri, 
        cpu: cpuValue, 
        memory: memoryValue, 
        essential: true,
        portMappings: [
            {
                containerPort: containerPort,
                hostPort: containerPort, 
            },
        ],
        logConfiguration: {
            logDriver: "awslogs",
            options: {
                "awslogs-group": `/ecs/fargate-app-${pulumi.getStack()}`,
                "awslogs-region": currentRegion,
                "awslogs-stream-prefix": "ecs",
            },
        },
    },
]));

// Create CloudWatch Log Group (name depends on stack to avoid conflicts)
new aws.cloudwatch.LogGroup("fargate-app-log-group", {
    name: `/ecs/fargate-app-${pulumi.getStack()}`,
    retentionInDays: 7,
});

const taskDefinition = new aws.ecs.TaskDefinition("taskdefinition", {
  family: "service",
  // Standard Fargate Requirements
  requiresCompatibilities: ["FARGATE"],
  networkMode: "awsvpc",
  
  // MANDATORY FARGATE CONFIG (using user's config values)
  cpu: cpuValue.toString(), 
  memory: memoryValue.toString(), 

  // Role Assignments
  taskRoleArn: taskExecutionRole.arn,
  executionRoleArn: executionRole.arn,

  // Container Definitions (using the resolved JSON string)
  containerDefinitions: containerDefinitionsJson,
});

/*
const lb = new aws.lb.LoadBalancer("lb", {
    name: "my-lb", 
    subnets: subnetIds,
    securityGroups: [securityGroupId],
    internal: false, 
    loadBalancerType: "application",
});
const targetGroup = new aws.lb.TargetGroup("app-tg", { 
    port: containerPort,
    protocol: "HTTP", 
    targetType: "ip",
    vpcId: vpcId, 
    healthCheck: { // Good practice to include a health check
        path: "/",
        protocol: "HTTP",
        matcher: "200",
        interval: 30,
        timeout: 5,
        healthyThreshold: 2,
    },
});

new aws.lb.Listener("app-listener", { 
    loadBalancerArn: lb.arn, 
    port: 80, 
    protocol: "HTTP", 
    defaultActions: [{
        type: "forward",
        targetGroupArn: targetGroup.arn,
    }],
});
*/

const service = new aws.ecs.Service("service", {
  launchType: "FARGATE", 
  taskDefinition: taskDefinition.arn,
  cluster: cluster.arn, // Use the ARN of the cluster
  desiredCount: 1,

  networkConfiguration: {
    assignPublicIp: true, 
    subnets: subnetIds,
    securityGroups: [securityGroupId], 
  },

});


// --- 6. Exports ---

export const taskDefinitionArn = taskDefinition.arn;
//export {lb}
export const ecrRepositoryUrl = repo.repository.repositoryUrl;
export const fargateServiceArn = service.arn;
