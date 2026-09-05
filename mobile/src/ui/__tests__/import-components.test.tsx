import { fireEvent, render } from '@testing-library/react-native';
import { AppButton, ExampleBox, ResultSummary, SelectableRow } from '../components';

describe('import presentation', () => {
  it('renders ExampleBox with bounded internal ScrollView and stable keys', async () => {
    const screen = await render(<ExampleBox title="Resultados" accessibilityLabel="Resultados de tareas" items={[{ externalId: 'todo-1', title: 'Comprar pan' }]} keyForItem={(item) => item.externalId} renderItem={(item) => <SelectableRow title={item.title} statusLabel="Disponible" selected={false} onPress={jest.fn()} />} />);
    expect(screen.getByText('Resultados')).toBeTruthy();
    expect(screen.getByLabelText('Comprar pan. Disponible')).toBeTruthy();
    expect(screen.getByLabelText('Resultados de tareas desplazable').props.nestedScrollEnabled).toBe(true);
  });

  it('has no virtualized-list warning in ExampleBox composition', async () => {
    const originalError = console.error;
    const errors: string[] = [];
    const errorSpy = jest.spyOn(console, 'error').mockImplementation((...args: unknown[]) => { const message = args.map(String).join(' '); errors.push(message); originalError(...args); });
    try {
      await render(<ExampleBox title="Resultados" items={[]} keyForItem={() => 'empty'} emptyContent={<></>} renderItem={() => null} />);
      expect(errors.some((message) => message.includes('VirtualizedLists should never be nested'))).toBe(false);
    } finally { errorSpy.mockRestore(); }
  });

  it('selects available rows once and keeps imported rows inert', async () => {
    const onPress = jest.fn();
    const available = await render(<SelectableRow title="Comprar pan" description="Para mañana" statusLabel="Disponible" selected={false} onPress={onPress} />);
    await fireEvent.press(available.getByLabelText('Comprar pan. Disponible'));
    expect(onPress).toHaveBeenCalledTimes(1);
    const imported = await render(<SelectableRow title="Tarea existente" statusLabel="Ya importada · no seleccionable" selected={false} disabled onPress={onPress} />);
    await fireEvent.press(imported.getByLabelText('Tarea existente. Ya importada · no seleccionable'));
    expect(onPress).toHaveBeenCalledTimes(1);
  });

  it('keeps CTA disabled while busy and renders four metrics', async () => {
    const button = await render(<AppButton title="Importar seleccionadas" disabled loading />);
    expect(button.getByRole('button').props.accessibilityState).toMatchObject({ disabled: true, busy: true });
    const summary = await render(<ResultSummary received={10} valid={8} imported={3} selectable={5} />);
    expect(summary.getByText('10')).toBeTruthy(); expect(summary.getByText('8')).toBeTruthy(); expect(summary.getByText('3')).toBeTruthy(); expect(summary.getByText('5')).toBeTruthy();
    expect(summary.queryByText('seleccionadas')).toBeNull();
  });
});
