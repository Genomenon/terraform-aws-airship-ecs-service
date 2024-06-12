/*jshint esversion: 8 */
const {
  ECSClient,
  DescribeServicesCommand,
  DescribeTaskDefinitionCommand,
  RunTaskCommand,
} = require("@aws-sdk/client-ecs");

const ecsClient = new ECSClient();

var returnMap = {
  image: "<ECS_SERVICE_DOES_NOT_EXIST_YET>",
  memory_reservation: "",
  cpu: "",
  memory: "",
  environment: "",
  docker_label_hash: "",
  secrets_hash: "",
  task_revision: "",
};

class AirshipLambdaError {
  constructor(message) {
    this.name = "AirshipLambdaError";
    this.message = message;
    this.stack = new Error().stack;
  }
}

exports.handler = async (event) => {
  //
  // ECS Cluster and Service Lookup
  //

  try {
    // This throws an error in case the Cluster has not been found
    const res = await ecsClient.send(
      new DescribeServicesCommand({
        cluster: event.ecs_cluster,
        services: [event.ecs_service],
      }),
    );

    // Throw an error when the lookup returns more than one service
    // Return empty definitions in case no services have been found
    if (res.services.length > 1) {
      const error = new AirshipLambdaError(
        `multiple services with name ${event.ecs_service} found in cluster ${event.ecs_cluster}`,
      );
      throw error;
    } else if (res.services.length < 1) {
      console.log("Could not find service, returning empty map");
      return returnMap;
    }

    //
    // ECS Task definition and container definition lookup
    //

    const taskDefinition = res.services[0].taskDefinition;

    const resTask = await ecsClient.send(
      new DescribeTaskDefinitionCommand({
        taskDefinition: taskDefinition,
      }),
    );

    if (resTask.taskDefinition.containerDefinitions.length != 1) {
      const error = new AirshipLambdaError(
        "only a single container is supported per task definition",
      );
      throw error;
    }

    // Match the container with the given container name
    var containerDefinitions =
      resTask.taskDefinition.containerDefinitions.filter(
        function (containerDef) {
          return containerDef.name == event.ecs_task_container_name;
        },
      );

    if (containerDefinitions.length != 1) {
      const error = new AirshipLambdaError(
        `Could not find container definition: ${event.ecs_task_container_name}`,
      );
      throw error;
    }

    var envDict = {};
    containerDefinitions[0].environment.forEach(function (element) {
      // HCL parses "true" as 1, we need to copy this behaviour
      envDict[String(element.name)] =
        String(element.value) == "true" ? "1" : String(element.value);
    });

    var dockerLabels = containerDefinitions[0].dockerLabels || {};

    // Populating the map for return
    returnMap.task_revision = String(resTask.taskDefinition.revision);
    returnMap.image = String(containerDefinitions[0].image);
    returnMap.memory_reservation = String(
      containerDefinitions[0].memoryReservation,
    );
    returnMap.cpu = String(containerDefinitions[0].cpu);
    returnMap.memory = String(containerDefinitions[0].memory);
    returnMap.environment = JSON.stringify(
      envDict,
      Object.keys(envDict).sort(),
    );
    returnMap.docker_label_hash = dockerLabels._airship_dockerlabel_hash || "";
    returnMap.secrets_hash = dockerLabels._airship_secrets_hash || "";

    console.log("Successfully returning populated map");
    console.log(returnMap);
    return returnMap;
  } catch (err) {
    console.error(err);
    throw new Error(`Error in ECS operations: ${err.message}`);
  }
};
