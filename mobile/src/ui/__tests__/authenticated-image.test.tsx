import { fireEvent, render } from '@testing-library/react-native';
import { AuthenticatedImage } from '../components';

describe('AuthenticatedImage', () => {
  it('prefers local source without credentials or remote request', async () => {
    const screen = await render(<AuthenticatedImage identity="owner:local-a" localUri="file:///a.jpg" remoteUri="https://api.test/a" token="token-a" />);
    expect(screen.getByTestId('image-owner:local-a').props.source).toEqual({ uri: 'file:///a.jpg' });
    await fireEvent(screen.getByTestId('image-owner:local-a'), 'load');
    expect(screen.queryByText('No se pudo cargar la imagen.')).toBeNull();
  });

  it('falls back from local to authenticated remote and clears its error on load', async () => {
    const screen = await render(<AuthenticatedImage identity="owner:local-a" localUri="file:///a.jpg" remoteUri="https://api.test/a" token="token-a" />);
    await fireEvent(screen.getByTestId('image-owner:local-a'), 'error');
    expect(screen.getByTestId('image-owner:local-a').props.source).toEqual({ uri: 'https://api.test/a', headers: { Authorization: 'Bearer token-a' } });
    await fireEvent(screen.getByTestId('image-owner:local-a'), 'load');
    expect(screen.queryByText('No se pudo cargar la imagen.')).toBeNull();
  });

  it('uses current token for remote-only source and resets on account change', async () => {
    const screen = await render(<AuthenticatedImage identity="owner-a:remote-a" remoteUri="https://api.test/a" token="token-a" />);
    expect(screen.getByTestId('image-owner-a:remote-a').props.source.headers.Authorization).toBe('Bearer token-a');
    await screen.rerender(<AuthenticatedImage identity="owner-b:remote-a" remoteUri="https://api.test/a" token="token-b" />);
    expect(screen.getByTestId('image-owner-b:remote-a').props.source.headers.Authorization).toBe('Bearer token-b');
    expect(screen.getByTestId('image-owner-b:remote-a').props.source.uri).not.toContain('token-b');
  });

  it('shows one error only after all sources fail and retry remounts that image', async () => {
    const screen = await render(<AuthenticatedImage identity="owner:local-a" localUri="file:///a.jpg" remoteUri="https://api.test/a" token="token-a" />);
    await fireEvent(screen.getByTestId('image-owner:local-a'), 'error');
    await fireEvent(screen.getByTestId('image-owner:local-a'), 'error');
    expect(screen.getAllByText('No se pudo cargar la imagen.')).toHaveLength(1);
    const before = screen.queryByTestId('image-owner:local-a');
    await fireEvent.press(screen.getByText('Reintentar'));
    const after = screen.getByTestId('image-owner:local-a');
    expect(after).not.toBe(before);
    expect(after.props.source.uri).toBe('file:///a.jpg');
  });

  it('keeps errors isolated between two images', async () => {
    const screen = await render(<>
      <AuthenticatedImage identity="owner:a" remoteUri="https://api.test/a" token="token" />
      <AuthenticatedImage identity="owner:b" remoteUri="https://api.test/b" token="token" />
    </>);
    await fireEvent(screen.getByTestId('image-owner:a'), 'error');
    expect(screen.getAllByText('No se pudo cargar la imagen.')).toHaveLength(1);
    expect(screen.queryByTestId('image-owner:a')).toBeNull();
    expect(screen.getByTestId('image-owner:b').props.source.uri).toBe('https://api.test/b');
  });
});
