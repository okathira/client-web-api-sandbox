import { Box, Button, Flex, Heading, Link, Text } from "@radix-ui/themes";

export function App() {
  return (
    <>
      <Flex direction="column" gap="5">
        <Box>
          <Heading>keyframe dropping</Heading>
          <Text>original sample codes: </Text>
          <Link href="https://developer.chrome.com/docs/web-platform/best-practices/webcodecs">
            WebCodecs による動画処理 | Web Platform | Chrome for Developers
          </Link>
        </Box>

        <Flex direction="column" id="app" gap="4">
          <Flex wrap="wrap" id="video-container" gap="2">
            <canvas id="src" width="640" height="480"></canvas>
            <canvas id="dst" width="640" height="480"></canvas>
          </Flex>
          <Flex id="controls" gap="2">
            <Button id="start">Start</Button>
            <Button id="stop">Stop</Button>
            <Button id="play">Play</Button>
            <Button id="pause">Pause</Button>
            <Button id="double">Double</Button>
            <Button id="drop">Drop</Button>
          </Flex>
        </Flex>
      </Flex>
    </>
  );
}
