import { motion, AnimatePresence } from "framer-motion";
import { useRef } from "react";

type CardStackProps = {
    scenarios: number[];
    currentScenarioIndex: number;
    isAnimating: boolean;
    currentScenario: { situation: string };
    nextCardContent: string;
    cardControls: {
        rotate: any;
        x: any;
        y: any;
        mainControls: any;
        handleDragEnd: (event: any, info: any) => void;
    };
};

export function CardStack({
    scenarios,
    currentScenarioIndex,
    isAnimating,
    currentScenario,
    nextCardContent,
    cardControls,
}: CardStackProps) {
    const randomRotations = useRef([
        (Math.random() - 0.5) * 5,
        (Math.random() - 0.5) * 5,
        (Math.random() - 0.5) * 5,
    ]);

    while (scenarios.length + 1 > randomRotations.current.length) {
        randomRotations.current.push((Math.random() - 0.5) * 5);
    }

    return (
        <div className="relative w-full aspect-[6/7]">
            <AnimatePresence>
                {scenarios[1] &&
                    scenarios.map(
                        (i) =>
                            i >= currentScenarioIndex && (
                                <motion.div
                                    key={`${i}`}
                                    animate={{
                                        scale: 0.95 ** (i - (currentScenarioIndex + (isAnimating && 1))),
                                        y: (i - (currentScenarioIndex + (isAnimating && 1))) * 30,
                                        opacity: 1,
                                    }}
                                    initial={{
                                        y: (i - currentScenarioIndex) * 30,
                                        opacity: 0,
                                        scale: 0.95 ** (i - currentScenarioIndex),
                                    }}
                                    style={{
                                        zIndex: scenarios.length - i,
                                        rotate: randomRotations.current[i],
                                        willChange: "transform, opacity",
                                    }}
                                    whileTap={{ cursor: "grabbing" }}
                                    className="absolute inset-0 touch-none"
                                    transition={{ duration: 0.5, ease: "easeInOut" }}
                                >
                                    <motion.div
                                        className="absolute inset-0 bg-black rounded-2xl shadow-xl"
                                        id={i + ""}
                                        style={i === currentScenarioIndex ? { rotate: cardControls.rotate, x: cardControls.x, y: cardControls.y } : {}}
                                        drag={i === currentScenarioIndex && !isAnimating}
                                        animate={i === currentScenarioIndex && cardControls.mainControls}
                                        dragConstraints={{
                                            top: 0,
                                            bottom: 0,
                                            left: -100,
                                            right: 100,
                                        }}
                                        onDragEnd={i === currentScenarioIndex ? cardControls.handleDragEnd : undefined}
                                    >
                                        <motion.div
                                            className="p-6 h-full flex flex-col bg-neutral-800 rounded-2xl"
                                            animate={{
                                                opacity: 1 - (i - (currentScenarioIndex + (isAnimating && 1))) * 0.2,
                                            }}
                                            initial={{
                                                opacity: 1 - (i - (currentScenarioIndex + (isAnimating && 1))) * 0.4,
                                            }}
                                        >
                                            <div className="flex-1 flex flex-col text-center items-center justify-around">
                                                <p className="font-mono text-sm md:text-base">
                                                    {i === currentScenarioIndex ? currentScenario.situation : nextCardContent}
                                                </p>
                                                <div className="w-32 h-32 bg-neutral-700 rounded-full" />
                                            </div>
                                        </motion.div>
                                    </motion.div>
                                </motion.div>
                            )
                    )}
            </AnimatePresence>
        </div>
    );
} 