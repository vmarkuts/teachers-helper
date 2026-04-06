export const concerns = [
  { id: 'behaviour', label: 'Behaviour', icon: 'AlertTriangle' },
  { id: 'anxiety', label: 'Anxiety', icon: 'Activity' },
  { id: 'attention', label: 'Attention', icon: 'Eye' },
  { id: 'social', label: 'Social & Peer', icon: 'Users' }
];

export const observationsByConcern = {
  behaviour: [
    "Refusal to follow instructions",
    "Calling out inappropriately",
    "Physical aggression towards peers",
    "Leaving seat without permission",
    "Disrupting others' learning"
  ],
  anxiety: [
    "Refusal to participate in activities",
    "Crying or visibly upset",
    "Asking to go to the toilet frequently to escape",
    "Complaining of a stomach ache or headache",
    "Freezing when asked a question"
  ],
  attention: [
    "Easily distracted by surroundings",
    "Difficulty sustaining attention on tasks",
    "Doesn't seem to listen when spoken to directly",
    "Fails to give close attention to details",
    "Avoids tasks requiring sustained mental effort"
  ],
  social: [
    "Difficulty taking turns in conversations",
    "Struggles to interpret peer social cues",
    "Isolates themselves during unstructured time",
    "Conflicts with peers over minor issues",
    "Interrupts peers frequently"
  ]
};
