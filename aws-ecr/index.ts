import * as pulumi from "@pulumi/pulumi";
import * as aws from "@pulumi/aws";
import * as awsx from "@pulumi/awsx";

const repo = new awsx.ecr.Repository("repo", {
    forceDelete: true,
});

const image = new awsx.ecr.Image("image", {
    repositoryUrl: repo.url,
    context: "../docker/app",
    platform: "linux/amd64",
});
