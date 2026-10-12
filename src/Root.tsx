import { MyComposition } from "./Composition";
import { TriCoachRennenKomposition } from "./TriCoachRennen/TriCoachRennen";

export const RemotionRoot: React.FC = () => {
  return (
    <>
      <MyComposition />
      <TriCoachRennenKomposition />
    </>
  );
};
